using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Infrastructure.Auth;
using CompanyWebsite.Infrastructure.Persistence;
using CompanyWebsite.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CompanyWebsite.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
            {
                sql.EnableRetryOnFailure(maxRetryCount: 5);
                // Detail pages include several child collections; split queries avoid cartesian explosion.
                sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
            }));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.Section));
        services.Configure<SeedOptions>(configuration.GetSection(SeedOptions.Section));

        services.AddSingleton<IPasswordHasher, IdentityPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddScoped<DbSeeder>();

        return services;
    }
}
