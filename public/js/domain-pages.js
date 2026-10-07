(() => {
  "use strict";
  const root = document.querySelector("[data-domain-page]");
  if (!root) return;
  root.addEventListener("pointermove", (event) => {
    const bounds = root.getBoundingClientRect();
    root.style.setProperty("--pointer-x", `${bounds.width - (event.clientX - bounds.left)}px`);
    root.style.setProperty("--pointer-y", `${bounds.height - (event.clientY - bounds.top)}px`);
  }, { passive: true });
  root.querySelectorAll("[data-step-button]").forEach((button, index) =>
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-stepper] li").forEach((item, i) => {
        item.classList.toggle("is-current", i === index);
        item
          .querySelector("button")
          .setAttribute("aria-expanded", i === index ? "true" : "false");
      });
    }),
  );
  const check = root.querySelector("[data-self-check]");
  if (check) {
    const boxes = [...check.querySelectorAll("input[type=checkbox]")],
      result = check.querySelector(".self-check-result");
    check.addEventListener("change", () => {
      const count = boxes.filter((box) => box.checked).length;
      result.textContent =
        count === boxes.length
          ? "Your answers suggest a reasonable starting point. Recheck the project brief before deciding."
          : count >= 3
            ? "You have some useful foundations. Review the unchecked prompts and plan how you would close those gaps."
            : "Use the unchecked prompts as a preparation list. They are guidance, not a pass/fail decision.";
    });
  }
  root.querySelectorAll("[data-skill-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const selected = button.dataset.skillFilter;
      root.querySelectorAll("[data-skill-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      root
        .querySelectorAll("[data-skill-group]")
        .forEach(
          (group) =>
            (group.hidden =
              selected !== "all" && group.dataset.skillGroup !== selected),
        );
    }),
  );
  const builder = root.querySelector("[data-cv-builder]");
  if (builder) {
    const tool = builder.querySelector("[data-cv-tool]"),
      metric = builder.querySelector("[data-cv-metric]"),
      output = builder.querySelector("[data-cv-output]"),
      template = output.textContent,
      status = builder.querySelector(".copy-status"),
      update = () => {
        output.textContent = template
          .replace(/\[tool\]|\[frontend tool\]/g, tool.value.trim() || "[tool]")
          .replace(/\[metric\]|\[number\]/g, metric.value.trim() || "[metric]");
      };
    tool.addEventListener("input", update);
    metric.addEventListener("input", update);
    builder
      .querySelector("[data-copy-cv]")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(output.textContent);
          status.textContent = "Draft copied.";
        } catch {
          status.textContent =
            "Copy unavailable; select the draft text manually.";
        }
      });
  }
  const print = root.querySelector("[data-print-checklist]");
  if (print) print.addEventListener("click", () => window.print());
})();
