// Utility helpers

// Async handler wrapper — avoids try/catch in every controller
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
