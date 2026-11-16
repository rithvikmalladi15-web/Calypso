import { useSyncExternalStore } from 'react'
export const routes = ['Overview','Simulation','Sensor Lab','Crew Health','Crew Nutrition','NASA Data','Experiments','Research','Reports','About'] as const
export type Route = typeof routes[number]
export const routeHref = (route: Route) => '#/' + route.toLowerCase().replaceAll(' ','-')
function subscribe(callback: () => void) {
  window.addEventListener('hashchange',callback)
  return () => window.removeEventListener('hashchange',callback)
}
export function useRoute() {
  return useSyncExternalStore(subscribe, () => routes.find(route=>routeHref(route)===location.hash.split("?")[0]) ?? 'Overview')
}
