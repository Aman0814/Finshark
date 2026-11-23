using System.Text.Json;
using api.Interfaces;
using api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [Route("api/stock-data")]
    [ApiController]
    [Authorize]
    public class StockDataController : ControllerBase
    {
        private readonly IFMPService _fmpService;

        public StockDataController(IFMPService fmpService)
        {
            _fmpService = fmpService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("A search query is required.");
            }

            return await GetExternalDataAsync(() => _fmpService.SearchCompaniesAsync(query));
        }

        [HttpGet("{symbol}/{dataType}")]
        public Task<IActionResult> GetCompanyData(
            [FromRoute] string symbol,
            [FromRoute] string dataType)
        {
            if (string.IsNullOrWhiteSpace(symbol))
            {
                return Task.FromResult<IActionResult>(BadRequest("A stock symbol is required."));
            }

            return GetExternalDataAsync(
                () => _fmpService.GetCompanyDataAsync(symbol, dataType));
        }

        private async Task<IActionResult> GetExternalDataAsync(
            Func<Task<JsonElement>> getData)
        {
            try
            {
                return Ok(await getData());
            }
            catch (FMPApiException error)
            {
                return StatusCode(error.StatusCode, error.Message);
            }
        }
    }
}
