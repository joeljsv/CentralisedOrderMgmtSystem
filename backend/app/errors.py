"""Domain-level exceptions mapped to HTTP responses in main.py."""


class AppError(Exception):
    """Base class for expected, client-facing errors."""

    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class BusinessRuleError(AppError):
    status_code = 400
