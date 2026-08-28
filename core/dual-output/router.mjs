export function routeIntent(input, registry) {
  if (!input || typeof input.idea !== 'string' || input.idea.trim().length === 0) throw new TypeError('routeIntent requires a non-empty input.idea');
  const preferred = typeof input.preferred_skill_id === 'string' ? input.preferred_skill_id.trim() : '';
  if (preferred && !registry.byId.has(preferred)) throw new Error(`Unknown preferred Skill: ${preferred}`);
  const searchText = [input.idea, input.emotion, input.environment, input.life, input.style].filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase();
  const candidates = registry.skills.map((skill) => {
    const matchedTags = skill.manifest.router.tags.filter((tag) => searchText.includes(tag.toLocaleLowerCase()));
    const matchedExamples = skill.manifest.router.examples.filter((example) => searchText.includes(example.toLocaleLowerCase()));
    const preferredMatch = preferred === skill.id;
    return { skillId: skill.id, score: (preferredMatch ? 10000 : 0) + matchedTags.length * 10 + matchedExamples.length * 2, priority: skill.priority, matchedTags, matchedExamples, preferred: preferredMatch };
  }).sort((left, right) => right.score - left.score || right.priority - left.priority || left.skillId.localeCompare(right.skillId));
  const selected = candidates[0];
  if (!selected) throw new Error('No enabled visual narrative Skill is registered');
  return {
    selectedSkillId: selected.skillId,
    fallback: selected.score === 0,
    candidates,
    reason: selected.preferred ? 'preferred_skill_id' : selected.matchedTags.length || selected.matchedExamples.length ? 'matched_manifest_router_tags' : 'highest_priority_fallback'
  };
}
