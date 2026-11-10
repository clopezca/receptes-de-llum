export function initStationNav() {
  const links = [...document.querySelectorAll(".step-wedge a")];
  const stations = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || stations.length === 0) return;

  const setCurrent = (id) => {
    for (const link of links) {
      if (link.getAttribute("href") === `#${id}`) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      }
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );

  for (const station of stations) observer.observe(station);
}
