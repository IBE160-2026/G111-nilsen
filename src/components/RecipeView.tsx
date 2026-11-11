import Link from "next/link";
import { withAppliedSuggestions, type Folder, type Recipe } from "@/domain";
import {
  applySuggestion,
  changeOriginalServings,
  fetchTimeFromSource,
  markCookedToday,
  addLabel,
  moveToFolder,
  moveToNewFolder,
  removeLabel,
  removeRecipe,
  removeSuggestion,
  rememberServings,
  requestSuggestions,
  saveFitsFor,
  saveNotes,
  saveRecipe,
  setFavorite,
} from "@/app/oppskrift/[id]/actions";
import { editRecipeMessages, sourceLinkMessages } from "@/lib/messages";
import { sourceLabel } from "@/lib/source-label";
import { isHttpUrl } from "@/lib/source-url";
import CookingMode from "./CookingMode";
import FetchTimeButton from "./FetchTimeButton";
import IngredientList from "./IngredientList";
import PrintButton from "./PrintButton";
import RecipeLabels from "./RecipeLabels";
import RecipeNotes from "./RecipeNotes";
import RecipeTime from "./RecipeTime";
import { loginHref } from "./LoginRequired";
import RecipeActions from "./RecipeActions";
import { SelectedServingsProvider } from "./SelectedServings";
import StepList from "./StepList";
import SuggestionsSection from "./SuggestionsSection";
import styles from "./RecipeView.module.css";

/**
 * Oppskriften i fast format (FR-5, UX-DR15): tittel, kilde, porsjonsvelger,
 * ingredienser per seksjon og nummererte steg. Serverkomponent; porsjonsvelger og
 * skalering ligger i klientkomponenten `IngredientList`, og stegene (med avkrysning) i
 * klientkomponenten `StepList`. Fra 768 px står
 * porsjonsvelger og ingredienser til venstre og stegene til høyre, med forslagene
 * (`SuggestionsSection`, Story 4.1) under begge; på smal skjerm står forslagene mellom
 * ingrediensene og stegene (UX). Nederst står
 * lagre-linjen (`RecipeActions`, Story 3.2); Server Actions bindes til oppskriftens id her.
 * `folders` er mappene å velge mellom i «Lagre i mappe» (Story 3.3); oppskriftens egen mappe er
 * `recipe.folderId`.
 */
export default function RecipeView({
  recipe,
  folders,
  signedIn = true,
}: {
  recipe: Recipe;
  folders: Folder[];
  /** `false` uten innlogging: lagre-linjen viser «Logg inn for å lagre» (Story 5.13). */
  signedIn?: boolean;
}) {
  // Forslag som er tatt i bruk vises i listene, merket «Forslag» (Story 5.11); originalen endres ikke.
  const shown = withAppliedSuggestions(recipe.ingredients, recipe.steps, recipe.suggestions);
  return (
    <SelectedServingsProvider>
      <article className={styles.root}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1>{recipe.title}</h1>
            <CookingMode
              title={recipe.title}
              steps={shown.steps}
              ingredients={shown.ingredients}
              originalServings={recipe.originalServings}
              selectedServings={recipe.selectedServings}
            />
            <Link
              href={`/oppskrift/${recipe.id}/rediger`}
              className={styles.edit}
              data-print="hide"
              aria-label={`${editRecipeMessages.editLink} ${recipe.title}`}
            >
              {editRecipeMessages.editLink}
            </Link>
            <span data-print="hide">
              <PrintButton title={recipe.title} />
            </span>
          </div>
          <p className={styles.meta}>
            {recipe.sourceUrl !== null && isHttpUrl(recipe.sourceUrl) ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.source}
                aria-label={`${sourceLabel(recipe)}, ${sourceLinkMessages.opensSuffix}`}
              >
                {sourceLabel(recipe)}
              </a>
            ) : (
              sourceLabel(recipe)
            )}
            {recipe.totalMinutes != null ? (
              <>
                <span aria-hidden="true">{" · "}</span>
                <RecipeTime minutes={recipe.totalMinutes} inline />
              </>
            ) : recipe.sourceUrl !== null && isHttpUrl(recipe.sourceUrl) ? (
              <span data-print="hide">
                <span aria-hidden="true">{" · "}</span>
                <FetchTimeButton onFetch={fetchTimeFromSource.bind(null, recipe.id)} />
              </span>
            ) : null}
          </p>
        </header>

        <div className={styles.columns}>
          <div className={styles.ingredients}>
            <IngredientList
              key={`ingredienser-${recipe.id}-${recipe.updatedAt}`}
              ingredients={shown.ingredients}
              originalServings={recipe.originalServings}
              selectedServings={recipe.selectedServings}
              onOriginalServingsChange={changeOriginalServings.bind(null, recipe.id)}
              // Valgt antall huskes bare for oppskrifter i samlingen.
              onServingsChange={
                recipe.savedAt !== null ? rememberServings.bind(null, recipe.id) : undefined
              }
            />
          </div>

          {/* Uten steg lages ingen tom rute, så rutenettet ikke får ekstra mellomrom. */}
          {shown.steps.length > 0 || shown.tips.length > 0 ? (
            <div className={styles.steps}>
              <StepList
                key={`steg-${recipe.id}-${recipe.updatedAt}`}
                steps={shown.steps}
                tips={shown.tips}
              />
            </div>
          ) : null}

          {/* Notater og «sist laget» bare for lagrede oppskrifter (Story 6.3). */}
          {recipe.savedAt !== null ? (
            <div className={styles.notes} data-print="hide">
              <RecipeLabels
                key={`merkelapper-${recipe.id}`}
                labels={recipe.labels ?? []}
                onAdd={addLabel.bind(null, recipe.id)}
                onRemove={removeLabel.bind(null, recipe.id)}
              />
              <RecipeNotes
                key={`notater-${recipe.id}`}
                notes={recipe.notes ?? null}
                fitsFor={recipe.fitsFor ?? null}
                lastCookedAt={recipe.lastCookedAt ?? null}
                cookedCount={recipe.cookedCount ?? 0}
                onSaveNotes={saveNotes.bind(null, recipe.id)}
                onSaveFitsFor={saveFitsFor.bind(null, recipe.id)}
                onCooked={markCookedToday.bind(null, recipe.id)}
              />
            </div>
          ) : null}

          <div className={styles.suggestions} data-print="hide">
            <SuggestionsSection
              key={`forslag-${recipe.id}`}
              onRequest={requestSuggestions.bind(null, recipe.id)}
              applied={recipe.suggestions}
              onApply={applySuggestion.bind(null, recipe.id)}
              onRemove={removeSuggestion.bind(null, recipe.id)}
            />
          </div>
        </div>

        <div data-print="hide">
          <RecipeActions
            title={recipe.title}
            saved={recipe.savedAt !== null}
            onSave={saveRecipe.bind(null, recipe.id)}
            onDelete={removeRecipe.bind(null, recipe.id)}
            folders={folders}
            folderId={recipe.folderId}
            onMoveToFolder={moveToFolder.bind(null, recipe.id)}
            onMoveToNewFolder={moveToNewFolder.bind(null, recipe.id)}
            isFavorite={recipe.isFavorite}
            onSetFavorite={setFavorite.bind(null, recipe.id)}
            loginHref={signedIn ? undefined : loginHref(`/oppskrift/${recipe.id}`)}
            totalMinutes={recipe.totalMinutes ?? null}
          />
        </div>
      </article>
    </SelectedServingsProvider>
  );
}
