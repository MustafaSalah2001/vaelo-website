using System.Security.Claims;
using System.Text;
using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CompanyWebsite.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "CompanyWebsite";
    public string Audience { get; set; } = "CompanyWebsite.Admin";

    /// <summary>HMAC-SHA256 key, at least 32 bytes. Supply via user-secrets or the Jwt__SigningKey env var.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; } = 120;

    public SymmetricSecurityKey GetSecurityKey()
    {
        if (Encoding.UTF8.GetByteCount(SigningKey) < 32)
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes. Set it with user-secrets or the Jwt__SigningKey environment variable.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
    }
}

public static class JwtClaims
{
    public const string Name = "name";
    public const string Role = "role";
}

public sealed class JwtTokenService(IOptions<JwtOptions> options, TimeProvider clock) : ITokenService
{
    public (string Token, DateTime ExpiresAt) CreateToken(AdminUser user)
    {
        var o = options.Value;
        var now = clock.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(o.ExpiryMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = o.Issuer,
            Audience = o.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            // Short claim names; the API sets MapInboundClaims = false and reads "role"/"name" directly.
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
                new Claim(JwtClaims.Name, user.DisplayName),
                new Claim(JwtClaims.Role, user.Role)
            }),
            SigningCredentials = new SigningCredentials(o.GetSecurityKey(), SecurityAlgorithms.HmacSha256)
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}

/// <summary>Adapts ASP.NET Core Identity's PBKDF2 password hasher without pulling in the full Identity stack.</summary>
public sealed class IdentityPasswordHasher : Application.Abstractions.IPasswordHasher
{
    private readonly PasswordHasher<AdminUser> _inner = new();

    public string Hash(AdminUser user, string password) => _inner.HashPassword(user, password);

    public bool Verify(AdminUser user, string password) =>
        _inner.VerifyHashedPassword(user, user.PasswordHash, password) != PasswordVerificationResult.Failed;
}
