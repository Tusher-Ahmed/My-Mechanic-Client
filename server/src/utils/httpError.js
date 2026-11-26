export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg = "Bad request") => new HttpError(400, msg);
export const unauthorized = (msg = "Please log in first") => new HttpError(401, msg);
export const forbidden = (msg = "You are not allowed to do this") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);
export const conflict = (msg = "Already exists") => new HttpError(409, msg);
