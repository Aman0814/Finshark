using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using api.Models;

namespace api.Interfaces
{
    public interface IFMPService
    {
        Task<JsonElement> SearchCompaniesAsync(string query);
        Task<JsonElement> GetCompanyDataAsync(string symbol, string dataType);
        Task<Stock?> FindStockBySymbolAsync(string symbol);
    }
}