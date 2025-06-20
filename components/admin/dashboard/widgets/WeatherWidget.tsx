
import React, { useState, useEffect, useCallback } from 'react'; 
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import { useWidgetCustomization } from '../../../../contexts/WidgetCustomizationContext';
import { WeatherUnit, WeatherLocationMode } from '../../../../types'; 

// Mock weather data structure
interface MockWeatherData {
  tempC: number;
  tempF: number;
  condition: string;
  iconClass: string; // FontAwesome icon class
  city: string;
}

// Mock API call
const mockFetchWeatherByCoords = (lat: number, lon: number, apiKey?: string): Promise<MockWeatherData> => {
  console.log(`Mock fetching weather for coords: ${lat}, ${lon} using API key: ${apiKey ? 'provided' : 'not provided'}`);
  return new Promise(resolve => {
    setTimeout(() => {
      const conditions = [
        { condition: "Sunny", iconClass: "fa-sun", tempC: 25, tempF: 77 },
        { condition: "Cloudy", iconClass: "fa-cloud", tempC: 18, tempF: 64 },
        { condition: "Rainy", iconClass: "fa-cloud-showers-heavy", tempC: 15, tempF: 59 },
        { condition: "Partly Cloudy", iconClass: "fa-cloud-sun", tempC: 20, tempF: 68 },
      ];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      resolve({ ...randomCondition, city: "Detected Location" });
    }, 1000);
  });
};

const mockFetchWeatherByCity = (city: string, apiKey?: string): Promise<MockWeatherData> => {
  console.log(`Mock fetching weather for city: ${city} using API key: ${apiKey ? 'provided' : 'not provided'}`);
  return new Promise(resolve => {
    setTimeout(() => {
      if (city.toLowerCase() === 'error') {
          throw new Error("Simulated API error for city lookup.");
      }
      const conditions = [
        { condition: "Windy", iconClass: "fa-wind", tempC: 12, tempF: 54 },
        { condition: "Foggy", iconClass: "fa-smog", tempC: 10, tempF: 50 },
        { condition: "Snowy", iconClass: "fa-snowflake", tempC: -2, tempF: 28 },
      ];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      resolve({ ...randomCondition, city: city });
    }, 1000);
  });
};


const WeatherWidget: React.FC = () => {
  const { customSettings, updateWeatherSettings, isLoadingCustomSettings } = useWidgetCustomization();
  const weatherSettings = customSettings.weather || { 
    unit: 'C' as WeatherUnit, 
    locationMode: 'auto' as WeatherLocationMode, 
    manualLocation: '', 
    lastCoords: null,
    apiKey: '',
  };

  const [weatherData, setWeatherData] = useState<MockWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For weather data fetching specifically
  const [error, setError] = useState<string | null>(null);
  
  const fetchWeather = useCallback(async () => {
    if (!weatherSettings.apiKey) {
      setError("Weather API key not configured. Please set it in Widget Settings.");
      setIsLoading(false);
      setWeatherData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (weatherSettings.locationMode === 'auto' && weatherSettings.lastCoords) {
        const data = await mockFetchWeatherByCoords(weatherSettings.lastCoords.lat, weatherSettings.lastCoords.lon, weatherSettings.apiKey);
        setWeatherData(data);
      } else if (weatherSettings.locationMode === 'manual' && weatherSettings.manualLocation) {
        const data = await mockFetchWeatherByCity(weatherSettings.manualLocation, weatherSettings.apiKey);
        setWeatherData(data);
      } else if (weatherSettings.locationMode === 'auto') {
        setError("Attempting to get your location...");
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            updateWeatherSettings({ lastCoords: { lat: latitude, lon: longitude } });
            // The useEffect for weatherSettings changes (isLoadingCustomSettings) will trigger a re-fetch
          },
          (geoError) => {
            setError(`Location error: ${geoError.message}. Try manual location via Widget Settings page.`);
            setIsLoading(false);
          }
        );
        return; 
      } else {
        setError("No location specified. Please set a location in Widget Settings page.");
        setWeatherData(null);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch weather data.");
      setWeatherData(null);
    }
    setIsLoading(false);
  }, [weatherSettings.locationMode, weatherSettings.manualLocation, weatherSettings.lastCoords, weatherSettings.apiKey, updateWeatherSettings]);

  useEffect(() => {
    if (!isLoadingCustomSettings) {
      fetchWeather();
      const intervalId = setInterval(fetchWeather, 30 * 60 * 1000); 
      return () => clearInterval(intervalId);
    }
  }, [fetchWeather, isLoadingCustomSettings]);
  
  const displayTemp = weatherData ? (weatherSettings.unit === 'C' ? weatherData.tempC : weatherData.tempF) : null;
  
  if (isLoadingCustomSettings) {
      return (
          <Card title="Weather" titleIcon="fa-cloud-sun" className="widget-card">
              <div className="text-center h-24 flex items-center justify-center"><LoadingSpinner/></div>
          </Card>
      );
  }

  return (
    <Card title="Weather" titleIcon="fa-cloud-sun" className="widget-card">
      {isLoading ? (
        <div className="h-24 flex items-center justify-center"><LoadingSpinner /></div>
      ) : error ? (
        <p className="text-sm text-center text-red-500 dark:text-red-400">{error}</p>
      ) : weatherData ? (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <i className={`fas ${weatherData.iconClass} text-4xl text-yellow-400 dark:text-yellow-300 mr-3`}></i>
            <div className="text-5xl font-bold text-[var(--color-primary-blue)]">
              {displayTemp}°
              <span className="text-3xl align-top">{weatherSettings.unit}</span>
            </div>
          </div>
          <p className="text-md text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
            {weatherData.condition} in {weatherData.city}
          </p>
        </div>
      ) : (
        <p className="text-sm text-center text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
          Weather data unavailable.
          {!weatherSettings.apiKey && " API key missing."}
          Configure via Widget Settings page.
        </p>
      )}
    </Card>
  );
};

export default WeatherWidget;