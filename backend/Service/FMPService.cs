using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using api.Dtos.Stock;
using api.Interfaces;
using api.Mappers;
using api.Models;
using Newtonsoft.Json;

namespace api.Service
{
    public class FMPService : IFMPService
    {
        private const string FmpBaseUrl = "https://financialmodelingprep.com/";
        private const string YahooBaseUrl = "https://query1.finance.yahoo.com/";
        private const string SecWebBaseUrl = "https://www.sec.gov/";
        private const string SecDataBaseUrl = "https://data.sec.gov/";
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private static readonly SemaphoreSlim SecTickerCacheLock = new(1, 1);
        private static Dictionary<string, SecTicker>? _secTickerCache;
        private static DateTime _secTickerCacheExpiresAt;

        public FMPService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        public async Task<JsonElement> SearchCompaniesAsync(string query)
        {
            var escapedQuery = Uri.EscapeDataString(query);
            if (HasFmpKey)
            {
                return await GetFmpJsonAsync(
                    $"api/v3/search?query={escapedQuery}&limit=10&exchange=NASDAQ");
            }

            var search = await GetJsonAsync(
                $"{YahooBaseUrl}v1/finance/search?q={escapedQuery}&quotesCount=10&newsCount=0");
            return MapYahooSearchResults(search);
        }

        public async Task<JsonElement> GetCompanyDataAsync(string symbol, string dataType)
        {
            var escapedSymbol = Uri.EscapeDataString(symbol);
            if (!HasFmpKey)
            {
                return dataType switch
                {
                    "profile" => await GetSecProfileAsync(symbol),
                    "income-statement" or "balance-sheet" or "cash-flow" =>
                        await GetFinancialStatementWithFallbackAsync(symbol, dataType),
                    "key-metrics" => await GetKeyMetricsWithFallbackAsync(symbol),
                    "ten-k" => await GetSecFilingsWithFallbackAsync(symbol),
                    "dividends" => await GetYahooDividendsAsync(escapedSymbol),
                    _ => throw new FMPApiException(
                        503,
                        "This data is not available from the SEC fallback. Configure an FMPKey for peer data.")
                };
            }

            var path = dataType switch
            {
                "profile" => $"api/v3/profile/{escapedSymbol}",
                "key-metrics" => $"api/v3/key-metrics-ttm/{escapedSymbol}?limit=40",
                "income-statement" => $"api/v3/income-statement/{escapedSymbol}?limit=50",
                "balance-sheet" => $"api/v3/balance-sheet-statement/{escapedSymbol}?limit=20",
                "cash-flow" => $"api/v3/cash-flow-statement/{escapedSymbol}?limit=100",
                "peers" => $"api/v4/stock_peers?symbol={escapedSymbol}",
                "ten-k" => $"api/v3/sec_filings/{escapedSymbol}?type=10-K&page=0",
                "dividends" => $"api/v3/historical-price-full/stock_dividend/{escapedSymbol}",
                _ => throw new FMPApiException(404, "Stock data endpoint not found.")
            };

            return await GetFmpJsonAsync(path);
        }

        public async Task<Stock?> FindStockBySymbolAsync(string symbol)
        {
            if (!HasFmpKey)
            {
                var profile = await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
                if (profile.ValueKind != JsonValueKind.Array || profile.GetArrayLength() == 0)
                {
                    return null;
                }

                var company = profile[0];
                return new Stock
                {
                    Symbol = ReadString(company, "symbol") ?? symbol,
                    CompanyName = ReadString(company, "companyName") ?? symbol,
                    Purchase = (decimal)ReadNumber(company, "price"),
                    LastDiv = 0,
                    Industry = "Unknown",
                    MarketCap = 0
                };
            }

            var fmpProfile = await GetCompanyDataAsync(symbol, "profile");
            if (fmpProfile.ValueKind != JsonValueKind.Array || fmpProfile.GetArrayLength() == 0)
            {
                return null;
            }

            var stocks = JsonConvert.DeserializeObject<FMPStock[]>(fmpProfile.GetRawText());
            return stocks?.FirstOrDefault()?.ToStockFromFMP();
        }

        private bool HasFmpKey => !string.IsNullOrWhiteSpace(_config["FMPKey"]);

        private async Task<JsonElement> GetSecProfileAsync(string symbol)
        {
            if (string.IsNullOrWhiteSpace(_config["SECUserAgent"]))
            {
                return await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
            }

            string cik;
            try
            {
                cik = await FindSecCikAsync(symbol);
            }
            catch (FMPApiException error) when (error.StatusCode == 404)
            {
                return await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
            }

            var submissions = await GetSecSubmissionsAsync(cik);
            JsonElement? yahooProfile = null;
            string? quoteError = null;

            try
            {
                var yahoo = await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
                if (yahoo.ValueKind == JsonValueKind.Array && yahoo.GetArrayLength() > 0)
                {
                    yahooProfile = yahoo[0];
                }
            }
            catch (FMPApiException error)
            {
                quoteError = error.Message;
            }

            var companyName = ReadString(submissions, "name") ?? symbol;
            var businessAddress = ReadPathString(
                submissions,
                "addresses",
                "business",
                "street1");
            var profile = new JsonObject
            {
                ["symbol"] = symbol.ToUpperInvariant(),
                ["companyName"] = companyName,
                ["price"] = yahooProfile.HasValue ? ReadNullableNumber(yahooProfile.Value, "price") : null,
                ["dcf"] = null,
                ["sector"] = null,
                ["industry"] = ReadString(submissions, "sicDescription"),
                ["description"] = ReadString(submissions, "description"),
                ["website"] = ReadString(submissions, "website"),
                ["phone"] = ReadString(submissions, "phone"),
                ["address"] = businessAddress,
                ["city"] = ReadPathString(submissions, "addresses", "business", "city"),
                ["state"] = ReadPathString(submissions, "addresses", "business", "stateOrCountryDescription")
                    ?? ReadPathString(submissions, "addresses", "business", "stateOrCountry"),
                ["zip"] = ReadPathString(submissions, "addresses", "business", "zipCode"),
                ["stateOfIncorporation"] = ReadString(submissions, "stateOfIncorporationDescription")
                    ?? ReadString(submissions, "stateOfIncorporation"),
                ["fiscalYearEnd"] = ReadString(submissions, "fiscalYearEnd"),
                ["currency"] = yahooProfile.HasValue
                    ? ReadString(yahooProfile.Value, "currency") ?? "USD"
                    : "USD",
                ["exchangeShortName"] = GetFirstString(submissions, "exchanges") ?? string.Empty,
                ["cik"] = cik,
                ["dataProvider"] = "SEC EDGAR",
                ["quoteProvider"] = yahooProfile.HasValue ? "Yahoo Finance" : null,
                ["quoteError"] = quoteError
            };

            return ParseElement(new JsonArray(profile).ToJsonString());
        }

        private async Task<JsonElement> GetSecFinancialStatementAsync(
            string symbol,
            string dataType)
        {
            var cik = await FindSecCikAsync(symbol);
            var facts = await GetSecCompanyFactsAsync(cik);
            return MapSecAnnualStatement(facts, symbol, dataType);
        }

        private async Task<JsonElement> GetFinancialStatementWithFallbackAsync(
            string symbol,
            string dataType)
        {
            try
            {
                return await GetSecFinancialStatementAsync(symbol, dataType);
            }
            catch (FMPApiException error) when (error.StatusCode == 404)
            {
                return await GetYahooFinancialStatementAsync(symbol, dataType);
            }
        }

        private async Task<JsonElement> GetKeyMetricsWithFallbackAsync(string symbol)
        {
            try
            {
                return await GetSecKeyMetricsAsync(symbol);
            }
            catch (FMPApiException error) when (error.StatusCode == 404)
            {
                return await GetYahooKeyMetricsAsync(symbol);
            }
        }

        private async Task<JsonElement> GetSecFilingsWithFallbackAsync(string symbol)
        {
            try
            {
                return await GetSecFilingsAsync(symbol);
            }
            catch (FMPApiException error) when (error.StatusCode == 404)
            {
                return ParseElement("[]");
            }
        }

        private async Task<JsonElement> GetYahooFinancialStatementAsync(
            string symbol,
            string statementType)
        {
            var fields = statementType switch
            {
                "income-statement" => new[]
                {
                    new YahooFinancialField("annualTotalRevenue", "revenue"),
                    new YahooFinancialField("annualCostOfRevenue", "costOfRevenue"),
                    new YahooFinancialField("annualGrossProfit", "grossProfit"),
                    new YahooFinancialField("annualDepreciationAndAmortization", "depreciationAndAmortization"),
                    new YahooFinancialField("annualOperatingIncome", "operatingIncome"),
                    new YahooFinancialField("annualPretaxIncome", "incomeBeforeTax"),
                    new YahooFinancialField("annualNetIncome", "netIncome"),
                    new YahooFinancialField("annualBasicEPS", "eps"),
                    new YahooFinancialField("annualDilutedEPS", "epsdiluted"),
                    new YahooFinancialField("annualDilutedAverageShares", "weightedAverageShsOutDil")
                },
                "balance-sheet" => new[]
                {
                    new YahooFinancialField("annualCashAndCashEquivalents", "cashAndCashEquivalents"),
                    new YahooFinancialField("annualCurrentAssets", "totalCurrentAssets"),
                    new YahooFinancialField("annualNetPPE", "propertyPlantEquipmentNet"),
                    new YahooFinancialField("annualGoodwillAndOtherIntangibleAssets", "intangibleAssets"),
                    new YahooFinancialField("annualTotalAssets", "totalAssets"),
                    new YahooFinancialField("annualOtherCurrentLiabilities", "otherCurrentLiabilities"),
                    new YahooFinancialField("annualCurrentLiabilities", "totalCurrentLiabilities"),
                    new YahooFinancialField("annualLongTermDebt", "longTermDebt"),
                    new YahooFinancialField("annualTotalLiabilitiesNetMinorityInterest", "totalLiabilities"),
                    new YahooFinancialField("annualOtherNonCurrentLiabilities", "otherLiabilities"),
                    new YahooFinancialField("annualRetainedEarnings", "retainedEarnings"),
                    new YahooFinancialField("annualStockholdersEquity", "totalStockholdersEquity")
                },
                "cash-flow" => new[]
                {
                    new YahooFinancialField("annualOperatingCashFlow", "operatingCashFlow"),
                    new YahooFinancialField("annualInvestingCashFlow", "netCashUsedForInvestingActivites"),
                    new YahooFinancialField("annualFinancingCashFlow", "netCashUsedProvidedByFinancingActivities"),
                    new YahooFinancialField("annualEndCashPosition", "cashAtEndOfPeriod"),
                    new YahooFinancialField("annualCapitalExpenditure", "capitalExpenditure", UseAbsoluteValue: true),
                    new YahooFinancialField("annualCommonStockIssuance", "commonStockIssued")
                },
                _ => throw new FMPApiException(404, "Stock data endpoint not found.")
            };
            var escapedSymbol = Uri.EscapeDataString(symbol);
            var requestedTypes = string.Join(",", fields.Select(field => field.YahooType));
            var period1 = DateTimeOffset.UtcNow.AddYears(-15).ToUnixTimeSeconds();
            var period2 = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var response = await GetJsonAsync(
                $"{YahooBaseUrl}ws/fundamentals-timeseries/v1/finance/timeseries/{escapedSymbol}" +
                $"?symbol={escapedSymbol}&type={requestedTypes}&period1={period1}&period2={period2}");

            if (!response.TryGetProperty("timeseries", out var timeSeries) ||
                !timeSeries.TryGetProperty("result", out var results) ||
                results.ValueKind != JsonValueKind.Array)
            {
                throw new FMPApiException(502, "Yahoo Finance returned invalid financial statement data.");
            }

            if (timeSeries.TryGetProperty("error", out var error) &&
                error.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined))
            {
                var description = ReadString(error, "description");
                throw new FMPApiException(
                    502,
                    description ?? "Yahoo Finance could not return financial statement data.");
            }

            var rows = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            foreach (var result in results.EnumerateArray())
            {
                foreach (var field in fields)
                {
                    if (!result.TryGetProperty(field.YahooType, out var values) ||
                        values.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var value in values.EnumerateArray())
                    {
                        var date = ReadString(value, "asOfDate");
                        var reportedValue = value.TryGetProperty("reportedValue", out var reported)
                            ? ReadNullableNumber(reported, "raw")
                            : null;
                        if (string.IsNullOrWhiteSpace(date) ||
                            !reportedValue.HasValue ||
                            (ReadString(value, "periodType") is { } periodType && periodType != "12M"))
                        {
                            continue;
                        }

                        if (!rows.TryGetValue(date, out var row))
                        {
                            row = new JsonObject
                            {
                                ["date"] = date,
                                ["symbol"] = symbol.ToUpperInvariant(),
                                ["period"] = "FY",
                                ["calendarYear"] = date.Substring(0, 4)
                            };
                            rows[date] = row;
                        }

                        row[field.OutputName] = field.UseAbsoluteValue
                            ? Math.Abs(reportedValue.Value)
                            : reportedValue.Value;
                    }
                }
            }

            foreach (var row in rows.Values)
            {
                if (statementType == "income-statement")
                {
                    var values = ParseElement(row.ToJsonString());
                    var revenue = ReadNullableNumber(values, "revenue");
                    row["netIncomeRatio"] = Divide(ReadNullableNumber(values, "netIncome"), revenue);
                    row["grossProfitRatio"] = Divide(ReadNullableNumber(values, "grossProfit"), revenue);
                    row["operatingIncomeRatio"] = Divide(ReadNullableNumber(values, "operatingIncome"), revenue);
                    row["incomeBeforeTaxRatio"] = Divide(ReadNullableNumber(values, "incomeBeforeTax"), revenue);
                }
                else if (statementType == "cash-flow")
                {
                    var values = ParseElement(row.ToJsonString());
                    var operatingCashFlow = ReadNullableNumber(values, "operatingCashFlow");
                    var capitalExpenditure = ReadNullableNumber(values, "capitalExpenditure");
                    row["freeCashFlow"] = operatingCashFlow.HasValue && capitalExpenditure.HasValue
                        ? operatingCashFlow.Value - capitalExpenditure.Value
                        : null;
                }
            }

            var orderedRows = rows.Values
                .OrderByDescending(row => row["date"]?.GetValue<string>())
                .Take(10)
                .ToArray();
            return ParseElement(new JsonArray(orderedRows).ToJsonString());
        }

        private async Task<JsonElement> GetYahooKeyMetricsAsync(string symbol)
        {
            var income = await GetYahooFinancialStatementAsync(symbol, "income-statement");
            var balance = await GetYahooFinancialStatementAsync(symbol, "balance-sheet");
            var cashFlow = await GetYahooFinancialStatementAsync(symbol, "cash-flow");
            var profile = await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
            var latestIncome = GetFirstArrayItem(income);
            var latestBalance = GetFirstArrayItem(balance);
            var latestCashFlow = GetFirstArrayItem(cashFlow);
            var shares = ReadNullableNumber(latestIncome, "weightedAverageShsOutDil");
            var price = profile.ValueKind == JsonValueKind.Array && profile.GetArrayLength() > 0
                ? ReadNullableNumber(profile[0], "price")
                : null;
            var assets = ReadNullableNumber(latestBalance, "totalAssets");
            var equity = ReadNullableNumber(latestBalance, "totalStockholdersEquity");
            var intangibles = ReadNullableNumber(latestBalance, "intangibleAssets") ?? 0;
            var netIncome = ReadNullableNumber(latestIncome, "netIncome");
            var freeCashFlow = ReadNullableNumber(latestCashFlow, "freeCashFlow");
            var eps = ReadNullableNumber(latestIncome, "epsdiluted");

            var metrics = new JsonObject
            {
                ["symbol"] = symbol.ToUpperInvariant(),
                ["marketCapTTM"] = shares.HasValue && price.HasValue ? shares.Value * price.Value : null,
                ["currentRatioTTM"] = Divide(
                    ReadNullableNumber(latestBalance, "totalCurrentAssets"),
                    ReadNullableNumber(latestBalance, "totalCurrentLiabilities")),
                ["roeTTM"] = Divide(netIncome, equity),
                ["returnOnTangibleAssetsTTM"] = Divide(netIncome, assets - intangibles),
                ["freeCashFlowPerShareTTM"] = Divide(freeCashFlow, shares),
                ["bookValuePerShareTTM"] = Divide(equity, shares),
                ["dividendYieldTTM"] = null,
                ["capexPerShareTTM"] = Divide(
                    ReadNullableNumber(latestCashFlow, "capitalExpenditure"),
                    shares),
                ["grahamNumberTTM"] = null,
                ["peRatioTTM"] = price.HasValue && eps > 0 ? price.Value / eps.Value : null,
                ["dataProvider"] = "Yahoo Finance"
            };

            return ParseElement(new JsonArray(metrics).ToJsonString());
        }

        private async Task<JsonElement> GetYahooDividendsAsync(string symbol)
        {
            var chart = await GetJsonAsync(
                $"{YahooBaseUrl}v8/finance/chart/{symbol}?range=max&interval=1mo&events=dividends");
            var historical = new JsonArray();

            if (chart.TryGetProperty("chart", out var chartData) &&
                chartData.TryGetProperty("result", out var results) &&
                results.ValueKind == JsonValueKind.Array &&
                results.GetArrayLength() > 0 &&
                results[0].TryGetProperty("events", out var events) &&
                events.TryGetProperty("dividends", out var dividends) &&
                dividends.ValueKind == JsonValueKind.Object)
            {
                var entries = dividends.EnumerateObject()
                    .Select(entry =>
                    {
                        var timestamp = ReadNumber(entry.Value, "date");
                        var amount = ReadNullableNumber(entry.Value, "amount");
                        return (Date: DateTimeOffset.FromUnixTimeSeconds((long)timestamp).UtcDateTime, Amount: amount);
                    })
                    .Where(entry => entry.Amount.HasValue)
                    .OrderByDescending(entry => entry.Date);

                foreach (var entry in entries)
                {
                    var date = entry.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                    historical.Add(new JsonObject
                    {
                        ["date"] = date,
                        ["label"] = date,
                        ["dividend"] = entry.Amount,
                        ["adjDividend"] = entry.Amount
                    });
                }
            }

            return ParseElement(new JsonObject
            {
                ["symbol"] = symbol,
                ["historical"] = historical
            }.ToJsonString());
        }

        private async Task<JsonElement> GetSecKeyMetricsAsync(string symbol)
        {
            var cik = await FindSecCikAsync(symbol);
            var facts = await GetSecCompanyFactsAsync(cik);
            var income = MapSecAnnualStatement(facts, symbol, "income-statement");
            var balance = MapSecAnnualStatement(facts, symbol, "balance-sheet");
            var cashFlow = MapSecAnnualStatement(facts, symbol, "cash-flow");
            var shares = GetLatestSecShares(facts);
            double? price = null;
            string? quoteError = null;

            try
            {
                var profile = await GetYahooProfileAsync(Uri.EscapeDataString(symbol));
                if (profile.ValueKind == JsonValueKind.Array && profile.GetArrayLength() > 0)
                {
                    price = ReadNullableNumber(profile[0], "price");
                }
            }
            catch (FMPApiException error)
            {
                quoteError = error.Message;
            }

            var latestIncome = GetFirstArrayItem(income);
            var latestBalance = GetFirstArrayItem(balance);
            var latestCashFlow = GetFirstArrayItem(cashFlow);
            var assets = ReadNullableNumber(latestBalance, "totalAssets");
            var equity = ReadNullableNumber(latestBalance, "totalStockholdersEquity");
            var intangibles = ReadNullableNumber(latestBalance, "intangibleAssets") ?? 0;
            var netIncome = ReadNullableNumber(latestIncome, "netIncome");
            var freeCashFlow = ReadNullableNumber(latestCashFlow, "freeCashFlow");
            var eps = ReadNullableNumber(latestIncome, "eps");
            var currentAssets = ReadNullableNumber(latestBalance, "totalCurrentAssets");
            var currentLiabilities = ReadNullableNumber(latestBalance, "totalCurrentLiabilities");

            var metrics = new JsonObject
            {
                ["symbol"] = symbol.ToUpperInvariant(),
                ["marketCapTTM"] = shares.HasValue && price.HasValue ? shares.Value * price.Value : null,
                ["currentRatioTTM"] = Divide(currentAssets, currentLiabilities),
                ["roeTTM"] = Divide(netIncome, equity),
                ["returnOnTangibleAssetsTTM"] = Divide(netIncome, assets - intangibles),
                ["freeCashFlowPerShareTTM"] = Divide(freeCashFlow, shares),
                ["bookValuePerShareTTM"] = Divide(equity, shares),
                ["dividendYieldTTM"] = null,
                ["capexPerShareTTM"] = Divide(
                    ReadNullableNumber(latestCashFlow, "capitalExpenditure"),
                    shares),
                ["grahamNumberTTM"] = null,
                ["peRatioTTM"] = price.HasValue && eps > 0 ? price.Value / eps.Value : null,
                ["quoteError"] = quoteError,
                ["dataProvider"] = "SEC EDGAR"
            };

            return ParseElement(new JsonArray(metrics).ToJsonString());
        }

        private async Task<JsonElement> GetSecFilingsAsync(string symbol)
        {
            var cik = await FindSecCikAsync(symbol);
            var submissions = await GetSecSubmissionsAsync(cik);
            var recent = submissions.GetProperty("filings").GetProperty("recent");
            var forms = recent.GetProperty("form");
            var filingDates = recent.GetProperty("filingDate");
            var accessions = recent.GetProperty("accessionNumber");
            var documents = recent.GetProperty("primaryDocument");
            var filings = new JsonArray();
            var cikForUrl = cik.TrimStart('0');

            for (var index = 0; index < forms.GetArrayLength() && filings.Count < 10; index++)
            {
                if (forms[index].GetString() != "10-K")
                {
                    continue;
                }

                var accession = accessions[index].GetString() ?? string.Empty;
                var document = documents[index].GetString() ?? string.Empty;
                var link = $"https://www.sec.gov/Archives/edgar/data/{cikForUrl}/" +
                    $"{accession.Replace("-", string.Empty, StringComparison.Ordinal)}/{document}";
                filings.Add(new JsonObject
                {
                    ["symbol"] = symbol.ToUpperInvariant(),
                    ["fillingDate"] = filingDates[index].GetString(),
                    ["cik"] = cik,
                    ["type"] = "10-K",
                    ["link"] = link,
                    ["finalLink"] = link
                });
            }

            return ParseElement(filings.ToJsonString());
        }

        private async Task<string> FindSecCikAsync(string symbol)
        {
            if (string.IsNullOrWhiteSpace(_config["SECUserAgent"]))
            {
                throw new FMPApiException(
                    503,
                    "SEC data requires SECUserAgent. Set it in backend User Secrets to an application name and contact email.");
            }

            var tickers = await GetSecTickerLookupAsync();
            if (!tickers.TryGetValue(symbol.Trim(), out var company))
            {
                throw new FMPApiException(
                    404,
                    $"The SEC does not have a U.S. filer for symbol {symbol}.");
            }

            return company.Cik;
        }

        private async Task<Dictionary<string, SecTicker>> GetSecTickerLookupAsync()
        {
            if (_secTickerCache != null && DateTime.UtcNow < _secTickerCacheExpiresAt)
            {
                return _secTickerCache;
            }

            await SecTickerCacheLock.WaitAsync();
            try
            {
                if (_secTickerCache != null && DateTime.UtcNow < _secTickerCacheExpiresAt)
                {
                    return _secTickerCache;
                }

                var response = await GetSecJsonAsync($"{SecWebBaseUrl}files/company_tickers.json");
                var tickers = new Dictionary<string, SecTicker>(StringComparer.OrdinalIgnoreCase);
                foreach (var item in response.EnumerateObject())
                {
                    var ticker = ReadString(item.Value, "ticker");
                    var cikValue = ReadNullableNumber(item.Value, "cik_str");
                    var name = ReadString(item.Value, "title");
                    if (!string.IsNullOrWhiteSpace(ticker) && cikValue.HasValue)
                    {
                        tickers[ticker] = new SecTicker(
                            ((long)cikValue.Value).ToString("D10", CultureInfo.InvariantCulture),
                            name ?? ticker);
                    }
                }

                _secTickerCache = tickers;
                _secTickerCacheExpiresAt = DateTime.UtcNow.AddHours(12);
                return tickers;
            }
            finally
            {
                SecTickerCacheLock.Release();
            }
        }

        private Task<JsonElement> GetSecSubmissionsAsync(string cik) =>
            GetSecJsonAsync($"{SecDataBaseUrl}submissions/CIK{cik}.json");

        private Task<JsonElement> GetSecCompanyFactsAsync(string cik) =>
            GetSecJsonAsync($"{SecDataBaseUrl}api/xbrl/companyfacts/CIK{cik}.json");

        private async Task<JsonElement> GetSecJsonAsync(string url)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.UserAgent.ParseAdd(_config["SECUserAgent"]);
                request.Headers.Accept.ParseAdd("application/json");
                using var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                    {
                        throw new FMPApiException(
                            502,
                            "The SEC rejected the request. Verify SECUserAgent contains your application name and contact email.");
                    }

                    throw new FMPApiException(
                        502,
                        $"The SEC data service returned HTTP {(int)response.StatusCode}.");
                }

                using var document = await JsonDocument.ParseAsync(
                    await response.Content.ReadAsStreamAsync());
                return document.RootElement.Clone();
            }
            catch (HttpRequestException)
            {
                throw new FMPApiException(502, "Could not reach the SEC data service.");
            }
            catch (System.Text.Json.JsonException)
            {
                throw new FMPApiException(502, "The SEC data service returned invalid data.");
            }
        }

        private static JsonElement MapSecAnnualStatement(
            JsonElement companyFacts,
            string symbol,
            string statementType)
        {
            if (companyFacts.ValueKind != JsonValueKind.Object ||
                !companyFacts.TryGetProperty("facts", out var facts) ||
                facts.ValueKind != JsonValueKind.Object ||
                !facts.TryGetProperty("us-gaap", out var gaap) ||
                gaap.ValueKind != JsonValueKind.Object)
            {
                return ParseElement("[]");
            }

            var definitions = statementType switch
            {
                "income-statement" => new[]
                {
                    new SecFactField("revenue", "USD", "RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"),
                    new SecFactField("costOfRevenue", "USD", "CostOfRevenue", "CostOfGoodsAndServicesSold"),
                    new SecFactField("grossProfit", "USD", "GrossProfit"),
                    new SecFactField("depreciationAndAmortization", "USD", "DepreciationDepletionAndAmortization"),
                    new SecFactField("operatingIncome", "USD", "OperatingIncomeLoss"),
                    new SecFactField("incomeBeforeTax", "USD", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"),
                    new SecFactField("netIncome", "USD", "NetIncomeLoss", "ProfitLoss"),
                    new SecFactField("eps", "USD/shares", "EarningsPerShareBasic"),
                    new SecFactField("epsdiluted", "USD/shares", "EarningsPerShareDiluted")
                },
                "balance-sheet" => new[]
                {
                    new SecFactField("cashAndCashEquivalents", "USD", "CashAndCashEquivalentsAtCarryingValue"),
                    new SecFactField("totalCurrentAssets", "USD", "AssetsCurrent"),
                    new SecFactField("propertyPlantEquipmentNet", "USD", "PropertyPlantAndEquipmentNet"),
                    new SecFactField("intangibleAssets", "USD", "FiniteLivedIntangibleAssetsNet", "IntangibleAssetsNetExcludingGoodwill"),
                    new SecFactField("totalAssets", "USD", "Assets"),
                    new SecFactField("otherCurrentLiabilities", "USD", "OtherLiabilitiesCurrent"),
                    new SecFactField("totalCurrentLiabilities", "USD", "LiabilitiesCurrent"),
                    new SecFactField("longTermDebt", "USD", "LongTermDebtNoncurrent", "LongTermDebt"),
                    new SecFactField("totalLiabilities", "USD", "Liabilities"),
                    new SecFactField("otherLiabilities", "USD", "OtherLiabilitiesNoncurrent"),
                    new SecFactField("retainedEarnings", "USD", "RetainedEarningsAccumulatedDeficit"),
                    new SecFactField("totalStockholdersEquity", "USD", "StockholdersEquity")
                },
                "cash-flow" => new[]
                {
                    new SecFactField("operatingCashFlow", "USD", "NetCashProvidedByUsedInOperatingActivities"),
                    new SecFactField("netCashUsedForInvestingActivites", "USD", "NetCashProvidedByUsedInInvestingActivities"),
                    new SecFactField("netCashUsedProvidedByFinancingActivities", "USD", "NetCashProvidedByUsedInFinancingActivities"),
                    new SecFactField("cashAtEndOfPeriod", "USD", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsIncludingDisposalGroupAndDiscontinuedOperation", "CashAndCashEquivalentsAtCarryingValue"),
                    new SecFactField("capitalExpenditure", "USD", "PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"),
                    new SecFactField("commonStockIssued", "USD", "ProceedsFromIssuanceOfCommonStock")
                },
                _ => Array.Empty<SecFactField>()
            };

            var rows = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            foreach (var field in definitions)
            {
                foreach (var (date, value) in GetSecAnnualValues(gaap, field))
                {
                    if (!rows.TryGetValue(date, out var row))
                    {
                        row = new JsonObject
                        {
                            ["date"] = date,
                            ["symbol"] = symbol.ToUpperInvariant(),
                            ["period"] = "FY",
                            ["calendarYear"] = date.Substring(0, 4)
                        };
                        rows[date] = row;
                    }

                    row[field.OutputName] = JsonValue.Create(value);
                }
            }

            foreach (var row in rows.Values)
            {
                if (statementType == "income-statement")
                {
                    var values = ParseElement(row.ToJsonString());
                    var revenue = ReadNullableNumber(values, "revenue");
                    var netIncome = ReadNullableNumber(values, "netIncome");
                    var grossProfit = ReadNullableNumber(values, "grossProfit");
                    var operatingIncome = ReadNullableNumber(values, "operatingIncome");
                    var incomeBeforeTax = ReadNullableNumber(values, "incomeBeforeTax");
                    row["netIncomeRatio"] = Divide(netIncome, revenue);
                    row["grossProfitRatio"] = Divide(grossProfit, revenue);
                    row["operatingIncomeRatio"] = Divide(operatingIncome, revenue);
                    row["incomeBeforeTaxRatio"] = Divide(incomeBeforeTax, revenue);
                }
                else if (statementType == "cash-flow")
                {
                    var operatingCashFlow = ReadNullableNumber(ParseElement(row.ToJsonString()), "operatingCashFlow");
                    var capitalExpenditure = ReadNullableNumber(ParseElement(row.ToJsonString()), "capitalExpenditure");
                    row["freeCashFlow"] = operatingCashFlow - capitalExpenditure;
                }
            }

            var result = rows.Values
                .OrderByDescending(row => row["date"]?.GetValue<string>())
                .Take(10)
                .ToArray();
            return ParseElement(new JsonArray(result).ToJsonString());
        }

        private static List<(string Date, double Value)> GetSecAnnualValues(
            JsonElement gaap,
            SecFactField field)
        {
            foreach (var tag in field.Tags)
            {
                if (!gaap.TryGetProperty(tag, out var fact) ||
                    !fact.TryGetProperty("units", out var units) ||
                    !units.TryGetProperty(field.Unit, out var values) ||
                    values.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                var latestByEnd = new Dictionary<string, (string Filed, double Value)>();
                foreach (var value in values.EnumerateArray())
                {
                    var form = ReadString(value, "form");
                    if (form is not ("10-K" or "20-F" or "40-F"))
                    {
                        continue;
                    }

                    var end = ReadString(value, "end");
                    if (string.IsNullOrWhiteSpace(end))
                    {
                        continue;
                    }

                    var start = ReadString(value, "start");
                    if (start != null)
                    {
                        if (!DateTime.TryParse(end, CultureInfo.InvariantCulture, out var endDate) ||
                            !DateTime.TryParse(start, CultureInfo.InvariantCulture, out var startDate) ||
                            (endDate - startDate).TotalDays is < 300 or > 400)
                        {
                            continue;
                        }
                    }
                    else if (ReadString(value, "fp") != "FY")
                    {
                        continue;
                    }

                    var filed = ReadString(value, "filed") ?? string.Empty;
                    if (!value.TryGetProperty("val", out var rawValue) ||
                        !rawValue.TryGetDouble(out var number))
                    {
                        continue;
                    }

                    if (!latestByEnd.TryGetValue(end, out var existing) ||
                        string.CompareOrdinal(filed, existing.Filed) > 0)
                    {
                        latestByEnd[end] = (filed, number);
                    }
                }

                if (latestByEnd.Count > 0)
                {
                    return latestByEnd
                        .Select(item => (item.Key, item.Value.Value))
                        .ToList();
                }
            }

            return new List<(string Date, double Value)>();
        }

        private static double? GetLatestSecShares(JsonElement companyFacts)
        {
            if (companyFacts.ValueKind != JsonValueKind.Object ||
                !companyFacts.TryGetProperty("facts", out var facts) ||
                facts.ValueKind != JsonValueKind.Object ||
                !facts.TryGetProperty("dei", out var dei) ||
                dei.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var field = new SecFactField(
                "shares",
                "shares",
                "EntityCommonStockSharesOutstanding");
            return GetSecAnnualValues(dei, field)
                .OrderByDescending(item => item.Date, StringComparer.Ordinal)
                .Select(item => (double?)item.Value)
                .FirstOrDefault();
        }

        private static JsonElement GetFirstArrayItem(JsonElement array) =>
            array.ValueKind == JsonValueKind.Array && array.GetArrayLength() > 0
                ? array[0]
                : ParseElement("{}");

        private static string? GetFirstString(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var values) ||
                values.ValueKind != JsonValueKind.Array ||
                values.GetArrayLength() == 0)
            {
                return null;
            }

            return values[0].GetString();
        }

        private static string? ReadPathString(JsonElement element, params string[] path)
        {
            foreach (var propertyName in path)
            {
                if (element.ValueKind != JsonValueKind.Object ||
                    !element.TryGetProperty(propertyName, out element))
                {
                    return null;
                }
            }

            return element.ValueKind == JsonValueKind.String ? element.GetString() : null;
        }

        private static double? ReadNullableNumber(JsonElement element, string propertyName)
        {
            return element.ValueKind == JsonValueKind.Object &&
                element.TryGetProperty(propertyName, out var value) &&
                value.TryGetDouble(out var number)
                    ? number
                    : null;
        }

        private static double? Divide(double? numerator, double? denominator) =>
            numerator.HasValue && denominator.HasValue && denominator.Value != 0
                ? numerator.Value / denominator.Value
                : null;

        private async Task<JsonElement> GetFmpJsonAsync(string path)
        {
            var apiKey = _config["FMPKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new FMPApiException(
                    503,
                    "Financial Modeling Prep is not configured. Set the backend FMPKey secret.");
            }

            var separator = path.Contains('?') ? '&' : '?';
            var url = $"{FmpBaseUrl}{path}{separator}apikey={Uri.EscapeDataString(apiKey)}";
            return await GetJsonAsync(url);
        }

        private async Task<JsonElement> GetYahooProfileAsync(string symbol)
        {
            var quote = await GetJsonAsync(
                $"{YahooBaseUrl}v8/finance/chart/{symbol}?range=1d&interval=1d");
            if (!quote.TryGetProperty("chart", out var chart) ||
                !chart.TryGetProperty("result", out var results) ||
                results.ValueKind != JsonValueKind.Array ||
                results.GetArrayLength() == 0)
            {
                return JsonDocument.Parse("[]").RootElement.Clone();
            }

            var metadata = results[0].GetProperty("meta");
            var name = ReadString(metadata, "longName")
                ?? ReadString(metadata, "shortName")
                ?? symbol;
            var price = ReadNumber(metadata, "regularMarketPrice");
            if (price == 0)
            {
                price = ReadNumber(metadata, "chartPreviousClose");
            }

            if (price <= 0)
            {
                throw new FMPApiException(404, "No quote was found for this stock symbol.");
            }

            var profile = new JsonObject
            {
                ["symbol"] = ReadString(metadata, "symbol") ?? symbol,
                ["companyName"] = name,
                ["price"] = price,
                ["dcf"] = null,
                ["sector"] = null,
                ["description"] = "Market quote data provided by Yahoo Finance.",
                ["dataProvider"] = "Yahoo Finance",
                ["currency"] = ReadString(metadata, "currency") ?? string.Empty,
                ["exchangeShortName"] = ReadString(metadata, "exchangeName") ?? string.Empty
            };

            return ParseElement(new JsonArray(profile).ToJsonString());
        }

        private static JsonElement MapYahooSearchResults(JsonElement search)
        {
            if (!search.TryGetProperty("quotes", out var quotes) ||
                quotes.ValueKind != JsonValueKind.Array)
            {
                return ParseElement("[]");
            }

            var results = new JsonArray();
            foreach (var quote in quotes.EnumerateArray())
            {
                if (ReadString(quote, "quoteType") != "EQUITY")
                {
                    continue;
                }

                results.Add(new JsonObject
                {
                    ["symbol"] = ReadString(quote, "symbol"),
                    ["name"] = ReadString(quote, "longname")
                        ?? ReadString(quote, "shortname")
                        ?? ReadString(quote, "symbol"),
                    ["currency"] = ReadString(quote, "currency") ?? string.Empty,
                    ["exchangeShortName"] = ReadString(quote, "exchange") ?? string.Empty,
                    ["stockExchange"] = ReadString(quote, "exchDisp") ?? string.Empty
                });
            }

            return ParseElement(results.ToJsonString());
        }

        private async Task<JsonElement> GetJsonAsync(string url)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.UserAgent.ParseAdd("FINSTOCKS/1.0");
                using var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    throw new FMPApiException(
                        502,
                        $"The external stock API returned HTTP {(int)response.StatusCode}.");
                }

                using var document = await JsonDocument.ParseAsync(
                    await response.Content.ReadAsStreamAsync());
                return document.RootElement.Clone();
            }
            catch (HttpRequestException)
            {
                throw new FMPApiException(502, "Could not reach the external stock API.");
            }
            catch (System.Text.Json.JsonException)
            {
                throw new FMPApiException(502, "The external stock API returned invalid data.");
            }
        }

        private static string? ReadString(JsonElement element, string propertyName)
        {
            return element.ValueKind == JsonValueKind.Object &&
                element.TryGetProperty(propertyName, out var value) &&
                value.ValueKind == JsonValueKind.String
                    ? value.GetString()
                    : null;
        }

        private static double ReadNumber(JsonElement element, string propertyName)
        {
            return element.ValueKind == JsonValueKind.Object &&
                element.TryGetProperty(propertyName, out var value) &&
                value.TryGetDouble(out var number)
                    ? number
                    : 0;
        }

        private static JsonElement ParseElement(string json)
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private sealed record SecTicker(string Cik, string Name);

        private sealed record SecFactField(string OutputName, string Unit, params string[] Tags);

        private sealed record YahooFinancialField(
            string YahooType,
            string OutputName,
            bool UseAbsoluteValue = false);
    }
}