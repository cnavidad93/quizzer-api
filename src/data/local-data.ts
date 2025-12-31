import europeFlags from "./flags/europe.json" with { type: "json" };
import americaFlags from "./flags/america.json" with { type: "json" };
import asiaFlags from "./flags/asia.json" with { type: "json" };
import allFlags from "./flags/all.json" with { type: "json" };
import europeCapitals from "./capitals/europe.json" with { type: "json" };
import europeCapitalsFl from "./capitals/europe-fl.json" with { type: "json" };
import avatarAssets from "./avatar-assets/assets.json" with { type: "json" };
import avatarCategories from "./avatar-assets/categories.json" with { type: "json" };

import { AvatarAsset, AvatarCategory, Game, Question } from "@/types";

const games = [europeFlags, americaFlags, asiaFlags, allFlags, europeCapitals, europeCapitalsFl] as Game[];

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

export function loadAvatarAssets() {
  return avatarAssets as unknown as AvatarAsset[];
}

export function loadAvatarCategories() {
  return avatarCategories as unknown as AvatarCategory[];
}
