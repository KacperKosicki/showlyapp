const Conversation = require("../models/Conversation");

function makePairKey(a, b) {
  return [String(a), String(b)].sort().join("|");
}

async function sendSystemMessage(toUid, content) {
  const cleanToUid = String(toUid || "").trim();
  const cleanContent = String(content || "").trim();

  if (!cleanToUid || !cleanContent) return null;

  const fromUid = "SYSTEM";
  const pairKey = makePairKey(fromUid, cleanToUid);

  let convo = await Conversation.findOne({
    channel: "system",
    pairKey,
  });

  if (!convo) {
    convo = await Conversation.create({
      channel: "system",
      pairKey,
      participants: [{ uid: fromUid }, { uid: cleanToUid }],
      firstFromUid: fromUid,
      messages: [
        {
          fromUid,
          toUid: cleanToUid,
          content: cleanContent,
          isSystem: true,
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      isClosed: false,
    });

    return convo;
  }

  convo.messages.push({
    fromUid,
    toUid: cleanToUid,
    content: cleanContent,
    isSystem: true,
    createdAt: new Date(),
  });

  convo.updatedAt = new Date();
  await convo.save();

  return convo;
}

module.exports = { sendSystemMessage };