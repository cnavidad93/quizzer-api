import europeFlags from "./europe.json";
import americaFlags from "./america.json";
import allFlags from "./all.json";

const games = [europeFlags, americaFlags, allFlags] as Game[];

import { Game, Question } from "@/types";

export function loadGames(): Promise<Game[]> {
  return Promise.resolve(games);
}
export function loadGame(id: string): Game {
  const game = games.find((g) => g.id === id)!;
  game.questions = getRandomQuestions(game);
  return game;
}

function getRandomQuestions(game: Game): Question[] {
  const shuffled = [...game.questions].sort(() => Math.random() - 0.5);
  return shuffled;
}
