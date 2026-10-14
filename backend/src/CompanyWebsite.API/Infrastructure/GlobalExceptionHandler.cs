using CompanyWebsite.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CompanyWebsite.API.Infrastructure;

/// <summary>
/// Turns application exceptions into RFC 7807 problem responses so every error the
/// frontend sees has the same shape. Unexpected exceptions are logged and return a
/// generic 500 without internal details.
/// </summary>
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem = exception switch
        {
            NotFoundException e => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not found",
                Detail = e.Message
            },
            ValidationException e => new ValidationProblemDetails(e.Errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Some fields need attention"
            },
            ConflictException e => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflict",
                Detail = e.Message
            },
            AuthenticationFailedException e => new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Sign-in failed",
                Detail = e.Message
            },
            OperationCanceledException when context.RequestAborted.IsCancellationRequested => new ProblemDetails
            {
                Status = 499,
                Title = "Request cancelled"
            },
            _ => new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Something went wrong on our side",
                Detail = "The error has been logged. Try again in a moment."
            }
        };

        if (problem.Status >= 500)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception
        });
    }
}
