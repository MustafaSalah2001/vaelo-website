namespace CompanyWebsite.Application.Common;

/// <summary>Thrown when a requested resource does not exist (mapped to HTTP 404).</summary>
public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} '{key}' was not found.")
{
    public string Resource { get; } = resource;
}

/// <summary>Thrown for business-rule violations not covered by DTO attributes (mapped to HTTP 400).</summary>
public sealed class ValidationException(IDictionary<string, string[]> errors)
    : Exception("One or more validation errors occurred.")
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static ValidationException For(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}

/// <summary>Thrown when a write would break a uniqueness rule, e.g. a duplicate slug (mapped to HTTP 409).</summary>
public sealed class ConflictException(string message) : Exception(message);

/// <summary>Thrown when credentials are invalid (mapped to HTTP 401).</summary>
public sealed class AuthenticationFailedException() : Exception("Email or password is incorrect.");
