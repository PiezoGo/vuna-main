const CHAT_KEY = 'vuna_local_chats';

function chatRoomId(userA, userB) {
  return [userA, userB].sort().join('__');
}

export function getLocalMessages(currentUserId, partnerId) {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    return all[chatRoomId(currentUserId, partnerId)] || [];
  } catch {
    return [];
  }
}

export function saveLocalMessage(currentUserId, partnerId, message) {
  const all = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  const room = chatRoomId(currentUserId, partnerId);
  const entry = {
    id: `local-${Date.now()}`,
    sender: currentUserId,
    receiver: partnerId,
    message,
    timestamp: new Date().toISOString(),
  };
  all[room] = [...(all[room] || []), entry];
  localStorage.setItem(CHAT_KEY, JSON.stringify(all));
  return entry;
}
