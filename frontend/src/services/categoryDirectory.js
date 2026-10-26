const guideIds = { "roads & infrastructure": 1, sanitation: 2, "water supply": 3, drainage: 4, "street lighting": 5, "parks & gardens": 6 };

// Preserve guidance without substituting fixture IDs/names for live departments.
export function buildCategoryDirectory(departments, guides) {
  return departments.map(department => {
    const guide = guides.find(item => item.id === guideIds[department.name.toLowerCase()]);
    return { ...guide, id: department.id, title: department.name, department: department.name,
      description: department.description || guide?.description || "Active civic department",
      reports: guide?.reports || [], filter: guide?.filter || department.name, searchLabel: guide?.title || "" };
  });
}

export function matchesCategory(category, filter, query) {
  const matchesFilter = filter === "All Issues" || filter === category.filter || filter === category.title;
  const text = [category.title, category.department, category.description, category.searchLabel, ...category.reports].join(" ").toLowerCase();
  return matchesFilter && text.includes(query.trim().toLowerCase());
}

// These are UI hints only; only a name returned by the API can be selected.
export function resolveCategory(requested, departments) {
 const aliases={roads:"Roads & Infrastructure",waste:"Sanitation",water:"Water Supply",streetlight:"Street Lighting",drainage:"Drainage",parks:"Parks & Gardens"};
 const wanted=aliases[requested] || requested;
 return departments.find(row=>row.name===wanted)?.name || "";
}
