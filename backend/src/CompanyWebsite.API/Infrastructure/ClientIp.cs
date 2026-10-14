using System.Security.Cryptography;
using System.Text;

namespace CompanyWebsite.API.Infrastructure;

public static class ClientIp
{
    /// <summary>Remote IP as a string; ForwardedHeaders middleware has already resolved proxies.</summary>
    public static string Get(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    /// <summary>
    /// Salted SHA-256 of the client IP. Lets admins spot repeated abuse without the
    /// database holding raw IP addresses.
    /// </summary>
    public static string Hash(HttpContext context, string salt)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(salt + "|" + Get(context)));
        return Convert.ToHexString(bytes);
    }
}
