// Server-Sent Events — per-user push notifications
// Maps userId (string) → Set of Express response objects
const clients = new Map();

// Public broadcast clients (no auth required)
const publicClients = new Set();

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
  res.on('close', () => {
    const set = clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(userId);
    }
  });
}

function addPublicClient(res) {
  publicClients.add(res);
  res.on('close', () => publicClients.delete(res));
}

function pushEvent(userId, event, data = {}) {
  const set = clients.get(userId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}

function broadcastEvent(event, data = {}) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of publicClients) {
    res.write(payload);
  }
  // Also push to all authenticated clients
  for (const [, set] of clients) {
    for (const res of set) {
      res.write(payload);
    }
  }
}

module.exports = { addClient, addPublicClient, pushEvent, broadcastEvent };
