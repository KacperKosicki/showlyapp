const PAID_PLANS = ['standard', 'premium'];
const idOf = value => String(typeof value === 'object' ? value?.id || '' : value || '');
const dateOf = seconds => Number.isFinite(Number(seconds)) && Number(seconds) > 0 ? new Date(Number(seconds) * 1000) : null;
const getSubscriptionPeriod = subscription => {
  const item = subscription?.items?.data?.[0];
  return {
    start: dateOf(item?.current_period_start ?? subscription?.current_period_start),
    end: dateOf(item?.current_period_end ?? subscription?.current_period_end),
  };
};
const getInvoiceSubscriptionId = invoice => idOf(invoice?.subscription || invoice?.parent?.subscription_details?.subscription);
const isModerationBlocked = (profile, now = new Date()) => profile.visibilityBlockedByAdmin === true ||
  (profile.visibilityBlockedByAdmin === undefined && profile.isVisible === false && new Date(profile.visibleUntil) > now);
const buildSubscriptionUpdate = (profile, subscription, fallback = {}, now = new Date()) => {
  const uid = String(subscription.metadata?.uid || fallback.uid || '');
  const profileId = String(subscription.metadata?.profileId || fallback.profileId || '');
  const customerId = idOf(subscription.customer);
  if ((uid && uid !== profile.userId) || (profileId && profileId !== String(profile._id)) ||
      (profile.billing?.stripeCustomerId && customerId !== profile.billing.stripeCustomerId)) {
    throw new Error('Subskrypcja nie należy do tej wizytówki.');
  }
  const priceId = idOf(subscription.items?.data?.[0]?.price);
  const fromPrice = priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY ? 'premium' : priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY ? 'standard' : '';
  const plan = fromPrice || subscription.metadata?.plan || fallback.plan;
  if (!PAID_PLANS.includes(plan)) throw new Error('Nie rozpoznano planu Showly w subskrypcji.');
  const period = getSubscriptionPeriod(subscription);
  const status = subscription.status || 'inactive';
  const active = ['active', 'trialing'].includes(status);
  if (active && !period.end) throw new Error('Stripe nie zwrócił końca okresu subskrypcji. Spróbuj ponownie.');
  const grace = new Date(profile.billing?.graceUntil || 0);
  const entitledUntil = active ? period.end : status === 'past_due' && grace > now ? grace : null;
  const set = {
    'billing.plan': plan, 'billing.status': status,
    'billing.stripeCustomerId': customerId,
    'billing.stripeSubscriptionId': subscription.id,
    'billing.stripePriceId': priceId,
    'billing.currentPeriodStart': period.start, 'billing.currentPeriodEnd': period.end,
    'billing.cancelAtPeriodEnd': !!subscription.cancel_at_period_end,
  };
  if (active) set['billing.graceUntil'] = null;
  const canRestore = !!entitledUntil && entitledUntil > now && !isModerationBlocked(profile, now);
  return { set, entitledUntil, canRestore, plan, status };
};
const applySubscriptionToProfile = async (Profile, subscription, fallback = {}) => {
  const uid = subscription.metadata?.uid || fallback.uid;
  const profileId = subscription.metadata?.profileId || fallback.profileId;
  const filter = uid ? { userId: uid } : profileId ? { _id: profileId } : { 'billing.stripeSubscriptionId': subscription.id };
  const profile = await Profile.findOne(filter);
  if (!profile) return { ok: false, reason: 'Nie znaleziono profilu subskrypcji.' };
  const update = buildSubscriptionUpdate(profile, subscription, fallback);
  await Profile.updateOne({ _id: profile._id }, { $set: update.set });
  if (update.canRestore) {
    await Profile.updateOne({ _id: profile._id, visibilityBlockedByAdmin: { $ne: true } }, {
      $set: { isVisible: true }, $max: { visibleUntil: update.entitledUntil },
    });
  }
  const current = await Profile.findById(profile._id);
  return { ok: true, uid: profile.userId, profileId: String(profile._id), plan: update.plan, status: update.status,
    restored: current.isVisible && new Date(current.visibleUntil) > new Date(),
    blockedByAdmin: isModerationBlocked(profile), visibleUntil: current.visibleUntil };
};
module.exports = { idOf, getSubscriptionPeriod, getInvoiceSubscriptionId, isModerationBlocked, buildSubscriptionUpdate, applySubscriptionToProfile };
