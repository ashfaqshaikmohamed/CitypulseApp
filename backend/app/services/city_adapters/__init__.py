from app.services.city_adapters.base import CityAdapter, NormalizedComplaint, ComplaintSubmission
from app.services.city_adapters.nyc import NYCAdapter
from app.services.city_adapters.chicago import ChicagoAdapter
from app.services.city_adapters.boston import BostonAdapter

class AdapterFactory:
    @staticmethod
    def get(api_type: str) -> CityAdapter:
        if api_type == "nyc_open_data":
            return NYCAdapter()
        elif api_type == "chicago_open_data":
            return ChicagoAdapter()
        elif api_type == "boston_open_data":
            return BostonAdapter()
        else:
            raise ValueError(f"Unknown 311 API adapter type: {api_type}")