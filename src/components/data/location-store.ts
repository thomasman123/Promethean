export type Country = { iso3: string; name: string }
export type Listener = () => void

const store = {
  selected: null as string[] | null,
  countries: [] as Country[],
  listeners: new Set<Listener>(),
  setSelected(next: string[] | null) {
    this.selected = next
    this.listeners.forEach((fn) => fn())
  },
  setCountries(list: Country[]) {
    this.countries = list
    this.listeners.forEach((fn) => fn())
  },
  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  },
}

export default store 