using CompanyWebsite.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace CompanyWebsite.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);

        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IServiceCatalog, ServiceCatalog>();
        services.AddScoped<ILookbookService, LookbookService>();
        services.AddScoped<IInquiryService, InquiryService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminProductService, AdminProductService>();

        return services;
    }
}
