namespace api.Service
{
    public class FMPApiException : Exception
    {
        public int StatusCode { get; }

        public FMPApiException(int statusCode, string message) : base(message)
        {
            StatusCode = statusCode;
        }
    }
}
