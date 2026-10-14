using CompanyWebsite.Infrastructure.Auth;
using CompanyWebsite.Infrastructure.Persistence;
using CompanyWebsite.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CompanyWebsite.Tests;

/// <summary>Creates an isolated in-memory database per test, optionally loaded with the demo content.</summary>
internal static class TestDb
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    public static async Task<AppDbContext> CreateSeededAsync(string? adminEmail = null, string? adminPassword = null)
    {
        var db = Create();
        var seeder = new DbSeeder(
            db,
            new IdentityPasswordHasher(),
            Options.Create(new SeedOptions { DemoContent = true, AdminEmail = adminEmail, AdminPassword = adminPassword }),
            NullLogger<DbSeeder>.Instance);
        await seeder.SeedAsync();
        db.ChangeTracker.Clear();
        return db;
    }
}
