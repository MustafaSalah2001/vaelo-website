using CompanyWebsite.API.Infrastructure;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CompanyWebsite.API.Controllers;

/// <summary>
/// Public form submissions. Protected by DTO validation, a honeypot field and a per-IP
/// fixed-window rate limit ("forms" policy).
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
[EnableRateLimiting(RateLimitPolicies.Forms)]
public sealed class InquiriesController(IInquiryService inquiries, IConfiguration config) : ControllerBase
{
    private string IpHash => ClientIp.Hash(HttpContext, config["Security:IpHashSalt"] ?? "vaelo");

    [HttpPost("contact")]
    [ProducesResponseType<SubmissionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public Task<SubmissionResultDto> Contact([FromBody] ContactInquiryRequest request, CancellationToken ct) =>
        inquiries.SubmitContactAsync(request, IpHash, ct);

    /// <summary>Reservation, made-to-measure or wholesale request.</summary>
    [HttpPost("requests")]
    [ProducesResponseType<SubmissionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public Task<SubmissionResultDto> SubmitRequest([FromBody] OrderRequestRequest request, CancellationToken ct) =>
        inquiries.SubmitOrderRequestAsync(request, IpHash, ct);
}

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>Exchange admin credentials for a JWT. Rate limited per IP.</summary>
    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<LoginResponse> Login([FromBody] LoginRequest request, CancellationToken ct) =>
        auth.LoginAsync(request, ct);
}
