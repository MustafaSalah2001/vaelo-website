# Build from the backend/ folder:  docker build -t companywebsite-api .
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Directory.Build.props CompanyWebsite.sln ./
COPY src/CompanyWebsite.Domain/CompanyWebsite.Domain.csproj src/CompanyWebsite.Domain/
COPY src/CompanyWebsite.Application/CompanyWebsite.Application.csproj src/CompanyWebsite.Application/
COPY src/CompanyWebsite.Infrastructure/CompanyWebsite.Infrastructure.csproj src/CompanyWebsite.Infrastructure/
COPY src/CompanyWebsite.API/CompanyWebsite.API.csproj src/CompanyWebsite.API/
RUN dotnet restore src/CompanyWebsite.API/CompanyWebsite.API.csproj
COPY src/ src/
RUN dotnet publish src/CompanyWebsite.API/CompanyWebsite.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "CompanyWebsite.API.dll"]
