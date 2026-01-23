import { WeatherScene } from './components/WeatherScene';
import { WeatherUI } from './components/WeatherUI';
import './App.css';
import 'weather-react-icons/lib/css/weather-icons.css';

function App() {
  return (
    <div className="app">
      <WeatherScene />
      <WeatherUI />
    </div>
  );
}

export default App;
