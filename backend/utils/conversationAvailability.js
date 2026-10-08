// Resolve dependencies in batches so an inbox does not query once per thread.
function createAvailabilityResolver({ User, Profile, Application, admin }) {
  return async function resolve(conversations) {
    const uids = [...new Set(conversations.filter(c => c.channel !== 'system')
      .flatMap(c => (c.participants || []).map(p => p.uid)))];
    const applicationIds = conversations.filter(c => c.channel === 'profile_to_account').map(c => c._id);
    const [users, profiles, applications] = await Promise.all([
      uids.length ? User.find({ firebaseUid: { $in: uids } }).select('firebaseUid').lean() : [],
      uids.length ? Profile.find({ userId: { $in: uids } }).select('userId isVisible visibleUntil visibilityBlockedByAdmin').lean() : [],
      applicationIds.length ? Application.find({ _id: { $in: applicationIds } })
        .select('_id announcementId').populate({ path: 'announcementId', select: 'title deletedAt' }).lean() : [],
    ]);
    const accountStates = new Map(uids.map(uid => [uid, 'account_missing']));
    const knownUids = users.map(u => u.firebaseUid);
    for (let start = 0; start < knownUids.length; start += 100) {
      const batch = knownUids.slice(start, start + 100);
      try {
        const result = await admin.auth().getUsers(batch.map(uid => ({ uid })));
        result.users.forEach(u => accountStates.set(u.uid, u.disabled ? 'account_disabled' : 'active'));
      } catch (err) {
        // A failed lookup is not evidence that an account has been removed.
        batch.forEach(uid => accountStates.set(uid, 'unavailable'));
        console.error('Conversation account lookup:', err.code || err.message);
      }
    }
    const profileMap = new Map(profiles.map(p => [p.userId, p]));
    const applicationMap = new Map(applications.map(a => [String(a._id), a]));
    const now = Date.now();
    return new Map(conversations.map(c => {
      const application = applicationMap.get(String(c._id));
      let reason = 'active';
      if (application && (!application.announcementId || application.announcementId.deletedAt)) reason = 'announcement_deleted';
      if (reason === 'active' && c.channel !== 'system') {
        reason = (c.participants || []).map(p => accountStates.get(p.uid) || 'account_missing')
          .find(state => state !== 'active') || 'active';
        const starter = c.firstFromUid || c.messages?.[0]?.fromUid;
        const providerUid = c.channel === 'account_to_profile'
          ? c.participants?.find(p => p.uid !== starter)?.uid : starter;
        const profile = profileMap.get(providerUid);
        if (reason === 'active') {
          if (!profile) reason = 'profile_missing';
          else if (profile.visibilityBlockedByAdmin) reason = 'profile_blocked';
          else if (profile.visibleUntil && new Date(profile.visibleUntil).getTime() <= now) reason = 'profile_expired';
          else if (profile.isVisible === false) reason = 'profile_hidden';
        }
      }
      return [String(c._id), {
        reason, canOpen: reason === 'active',
        ...(application?.announcementId ? { announcement: {
          id: String(application.announcementId._id), title: application.announcementId.title,
          deleted: Boolean(application.announcementId.deletedAt),
        } } : {}),
      }];
    }));
  };
}

module.exports = { createAvailabilityResolver };
