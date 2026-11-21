// actions: { actionName: function }. Menu items name theirs with data-action.
export function initMenus(actions) {
  const menus = [...document.querySelectorAll(".menu")];
  const dropdownOf = (menu) => menu.querySelector(".dropdown");
  const buttonOf = (menu) => menu.querySelector(".menu-item");

  function closeAll() {
    for (const menu of menus) {
      dropdownOf(menu).hidden = true;
      buttonOf(menu).classList.remove("open");
    }
  }

  function open(menu) {
    closeAll();
    dropdownOf(menu).hidden = false;
    buttonOf(menu).classList.add("open");
  }

  const anyOpen = () => menus.some((m) => !dropdownOf(m).hidden);

  for (const menu of menus) {
    const button = buttonOf(menu);
    const dropdown = dropdownOf(menu);

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdown.hidden) open(menu); else closeAll();
    });

    // While one menu is open, hovering another one switches to it.
    button.addEventListener("mouseenter", () => {
      if (anyOpen() && dropdown.hidden) open(menu);
    });

    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest("[data-action]");
      if (!item) return;
      closeAll();
      item.blur();
      const run = actions[item.dataset.action];
      if (run) run();
    });
  }

  document.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}