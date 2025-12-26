import europeFlags from "./europe.json" with { type: "json" };
import americaFlags from "./america.json" with { type: "json" };
import allFlags from "./all.json" with { type: "json" };

import { Game, Question } from "@/types";

const games = [europeFlags, americaFlags, allFlags] as Game[];

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
