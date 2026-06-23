import './styles.css';
import { GameApp } from './game/GameApp.js';

const root = document.querySelector('#app');
const game = new GameApp(root);
game.mount();

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
