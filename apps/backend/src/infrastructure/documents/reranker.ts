export interface RerankableResult {
  id: string;
  content: string;
  similarity: number;
  createdAt: Date | string;
}

export type RerankedResult<T extends RerankableResult> = T & {
  finalScore: number;
  keywordScore: number;
  recencyScore: number;
};

export class Reranker {
  public rerank<T extends RerankableResult>(query: string, results: T[]): Array<RerankedResult<T>> {
    const keywords = new Set(query.toLowerCase().split(/\s+/).filter((item) => item.length > 2));
    const now = Date.now();

    return results
      .map((result) => {
        const content = result.content.toLowerCase();
        const keywordHits = keywords.size === 0 ? 0 : [...keywords].filter((keyword) => content.includes(keyword)).length;
        const keywordScore = keywords.size === 0 ? 0 : keywordHits / keywords.size;
        const createdAt = new Date(result.createdAt).getTime();
        const ageDays = Math.max(0, Math.floor((now - createdAt) / 86_400_000));
        const recencyScore = Math.max(0, 1 - ageDays / 365);
        const finalScore = result.similarity * 0.7 + keywordScore * 0.2 + recencyScore * 0.1;

        return {
          ...result,
          keywordScore,
          recencyScore,
          finalScore
        };
      })
      .sort((left, right) => right.finalScore - left.finalScore);
  }
}
