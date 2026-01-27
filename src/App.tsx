import { Suspense, lazy } from 'react';
import { WeatherUI } from './components/WeatherUI';
import './App.css';
import 'weather-react-icons/lib/css/weather-icons.css';

const WeatherScene = lazy(() =>
  import('./components/WeatherScene').then(({ WeatherScene }) => ({ default: WeatherScene }))
);

function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#weather-main">
        Skip to weather insights
      </a>
      <Suspense fallback={<div className="canvas-fallback" aria-hidden="true" />}> 
        <WeatherScene />
      </Suspense>
      <WeatherUI />
    </div>
  );
}

export default App;
