const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema(
  {
    // kto dodał do ulubionych (Firebase UID)
    ownerUid: { type: String, required: true, index: true },

    // czyj profil polubiono (Firebase UID właściciela profilu)
    profileUserId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// jeden użytkownik może dodać dany profil tylko raz
FavoriteSchema.index({ ownerUid: 1, profileUserId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
