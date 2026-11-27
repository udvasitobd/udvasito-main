/**
 * Where a request is, in words, for donors (NTF-01, the inbox, SCR-D04): the hospital's name in each language, else
 * the place the requester typed, else the thana — plus the thana as the area. Typed text is free text, so any phone
 * number in it is masked before it can reach a lock screen or a donor's list (P-13, CLAUDE.md rule 3).
 */
import { scrubText } from '../../src/lib/scrub';
import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import type { Language } from './alertText';

export type Named = Record<Language, string>;

export async function requestPlaceNames(
  ctx: Pick<QueryCtx, 'db'>,
  request: Doc<'requests'>,
): Promise<{ place: Named; area: Named }> {
  const [hospital, thana] = await Promise.all([
    request.hospitalId ? ctx.db.get(request.hospitalId) : null,
    ctx.db.get(request.upazilaId),
  ]);
  const area = { en: thana?.nameEn ?? '', bn: thana?.nameBn ?? '' };
  if (hospital) return { place: { en: hospital.nameEn, bn: hospital.nameBn }, area };
  if (request.placeText) {
    const typed = scrubText(request.placeText);
    return { place: { en: typed, bn: typed }, area };
  }
  return { place: area, area };
}
