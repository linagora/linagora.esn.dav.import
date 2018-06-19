const handlers = {};

module.exports = {
  register,
  get
};

function register(type, handler) {
  if (get(type)) {
    throw new Error(`handler for type "${type}" already registered`);
  }

  if (typeof handler.readLines !== 'function') {
    throw new Error('handler.readLines function is required');
  }

  if (typeof handler.importItem !== 'function') {
    throw new Error('handler.importItem function is required');
  }

  handlers[type] = handler;
}

function get(type) {
  return handlers[type];
}
