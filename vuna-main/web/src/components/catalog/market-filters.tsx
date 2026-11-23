"use client";

import type { FacetValue } from "@vuna/api";
import { Search, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORTS, hasFilters, marketHref, type MarketSearch } from "@/features/catalog/search-params";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

type Facets = { commodities: FacetValue[]; cities: FacetValue[]; markets: FacetValue[] };

const ANY = "__any__";

/** Search box, filter menus and sort. Every change updates the URL, so the server re-renders the results. */
export function MarketFilters({ search, facets }: { search: MarketSearch; facets: Facets }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState(search.q ?? "");

  const go = React.useCallback(
    (patch: Partial<MarketSearch>) => {
      // Any change of filters starts again from page 1.
      const href = marketHref({ ...search, ...patch, page: 1 });
      startTransition(() => router.replace(href as Route, { scroll: false }));
    },
    [router, search],
  );
  const searchLater = useDebouncedCallback(
    (value: string) => go({ q: value.trim() || undefined }),
    450,
  );

  return (
    <div className="grid gap-3" aria-busy={pending}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: query.trim() || undefined });
        }}
        className="relative"
      >
        <Label htmlFor="market-search" className="sr-only">
          Search produce
        </Label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="market-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchLater(e.target.value);
          }}
          placeholder="Search tomatoes, onions, avocados…"
          className="h-12 pl-10 text-[15px]"
        />
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FacetSelect
          id="f-commodity"
          label="Produce"
          value={search.commodity}
          options={facets.commodities}
          onChange={(v) => go({ commodity: v })}
        />
        <FacetSelect
          id="f-city"
          label="Area"
          value={search.city}
          options={facets.cities}
          onChange={(v) => go({ city: v })}
        />
        <FacetSelect
          id="f-market"
          label="Market"
          value={search.market}
          options={facets.markets}
          onChange={(v) => go({ market: v })}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="f-sort" className="text-xs text-muted-foreground">
            Sort by
          </Label>
          <Select
            value={search.sort}
            onValueChange={(v) => go({ sort: v as MarketSearch["sort"] })}
          >
            <SelectTrigger id="f-sort">
              {/* Text given explicitly so the server-rendered page shows it before hydration. */}
              <SelectValue>{SORTS.find((s) => s.value === search.sort)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters(search) ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              startTransition(() =>
                router.replace(marketHref({ sort: search.sort }) as Route, { scroll: false }),
              );
            }}
          >
            <X /> Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type FacetSelectProps = {
  id: string;
  label: string;
  value: string | undefined;
  options: FacetValue[];
  onChange: (value: string | undefined) => void;
};

function FacetSelect({ id, label, value, options, onChange }: FacetSelectProps) {
  // Keep a value from the URL selectable even if it has no live listings right now.
  const all =
    value && !options.some((o) => o.value.toLowerCase() === value.toLowerCase())
      ? [{ value, count: 0 }, ...options]
      : options;
  const selected = all.find((o) => o.value.toLowerCase() === value?.toLowerCase())?.value;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={selected ?? ANY} onValueChange={(v) => onChange(v === ANY ? undefined : v)}>
        <SelectTrigger id={id}>
          <SelectValue>
            <span className="capitalize">{selected ?? "All"}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All</SelectItem>
          {all.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="capitalize">{o.value}</span>
              <span className="ml-1.5 text-muted-foreground">{o.count > 0 ? o.count : ""}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
