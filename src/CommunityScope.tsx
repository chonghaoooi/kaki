import { useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Buildings, CaretDown, CheckCircle, MapTrifold, ShieldCheck } from "@phosphor-icons/react";
import { networkNames, useKaki } from "./kaki-context";
import { BottomSheet, useKeyboard } from "./mobile";
import "./community-scope.css";

export type CommunityView = "campus" | "neighbourhood";
const privacyDescription = "School events stay within your education and age community. Community organisers set their own eligibility.";

function ChoiceCopy({ scope, institution }: { scope: CommunityView; institution: string }) {
  const Icon = scope === "campus" ? Buildings : MapTrifold;
  return (
    <>
      <span className={`community-scope-choice-icon ${scope === "neighbourhood" ? "is-neighbourhood" : ""}`}><Icon size={24} weight="duotone" aria-hidden="true" /></span>
      <span className="community-scope-choice-copy">
        <strong>{scope === "campus" ? "Campus" : "Neighbourhood"}</strong>
        <span>{scope === "campus" ? institution : "Other schools, MCCY & NYC"}</span>
      </span>
    </>
  );
}

export function CommunityScope({ scope, compact = false }: { scope: CommunityView; compact?: boolean }) {
  const { user, desktop, go } = useKaki();
  const keyboard = useKeyboard();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const institution = user?.institution || "Your campus";
  const shortInstitution = institution.replace(/ Polytechnic$/i, " Poly");
  const label = scope === "campus" ? (networkNames[user?.network] || "CAMPUS COMMUNITY") : "NEIGHBOURHOOD";

  // BottomSheet's internal Dialog has no Trigger slot. Restore focus explicitly
  // after dismissal; the desktop Radix menu handles its own focus lifecycle.
  useEffect(() => {
    if (!desktop && wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [desktop, open]);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) keyboard.hide();
    setOpen(nextOpen);
  }

  function select(nextScope: CommunityView) {
    setOpen(false);
    if (nextScope !== scope) go(nextScope === "campus" ? "discover" : "neighbourhood");
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={`community-badge community-scope-trigger${compact ? " community-scope-compact" : ""}`}
      aria-label={`Change community view, currently ${scope === "campus" ? "Campus" : "Neighbourhood"}`}
      aria-expanded={open}
      aria-haspopup={desktop ? "menu" : "dialog"}
      onClick={desktop ? undefined : () => changeOpen(!open)}
    >
      {!compact && (scope === "campus" ? <CheckCircle weight="fill" size={19} aria-hidden="true" /> : <MapTrifold weight="duotone" size={19} aria-hidden="true" />)}
      <strong>{compact ? (scope === "campus" ? <>Campus <span aria-hidden="true">·</span> {shortInstitution}</> : "Neighbourhood") : label}</strong>
      <CaretDown className="community-scope-caret" size={14} weight="bold" aria-hidden="true" />
    </button>
  );

  if (desktop) return (
    <DropdownMenu.Root open={open} onOpenChange={changeOpen}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="community-scope-menu" side="bottom" align="start" sideOffset={11} collisionPadding={16} loop aria-label="Choose your community view" onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus(); }}>
          <DropdownMenu.Label className="community-scope-menu-heading">Find your kind of company</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={scope} aria-label="Community view">
            {(["campus", "neighbourhood"] as const).map(option => (
              <DropdownMenu.RadioItem className="community-scope-choice" value={option} key={option} onSelect={() => select(option)} textValue={option === "campus" ? "Campus" : "Neighbourhood"}>
                <ChoiceCopy scope={option} institution={institution} />
                <span className="community-scope-selection"><DropdownMenu.ItemIndicator><CheckCircle size={20} weight="fill" aria-hidden="true" /></DropdownMenu.ItemIndicator></span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <div className="community-scope-privacy"><ShieldCheck size={17} aria-hidden="true" /><p>{privacyDescription}</p></div>
          <DropdownMenu.Arrow className="community-scope-menu-arrow" width={14} height={7} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <>
      {trigger}
      <BottomSheet open={open} onOpenChange={changeOpen} title="Find your kind of company" description="Choose where you want to discover your next plan." snap={0.62}>
        <div className="community-scope-sheet">
          <div className="community-scope-options" role="group" aria-label="Community view">
            {(["campus", "neighbourhood"] as const).map(option => (
              <button type="button" className={`community-scope-choice ${scope === option ? "is-selected" : ""}`} key={option} aria-pressed={scope === option} onClick={() => select(option)}>
                <ChoiceCopy scope={option} institution={institution} />
                <span className="community-scope-selection">{scope === option && <CheckCircle size={20} weight="fill" aria-hidden="true" />}</span>
              </button>
            ))}
          </div>
          <div className="community-scope-privacy"><ShieldCheck size={18} aria-hidden="true" /><p>{privacyDescription}</p></div>
          <button type="button" className="community-scope-dismiss" onClick={() => changeOpen(false)}>Keep browsing</button>
        </div>
      </BottomSheet>
    </>
  );
}

export default CommunityScope;
