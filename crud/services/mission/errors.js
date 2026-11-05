/** Error carrying an HTTP status so controllers/handlers can map it. */
export class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message
   * @param {object} [details]
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}