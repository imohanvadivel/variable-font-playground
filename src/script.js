/*
=============================================================================
MIT License

Copyright (c) 2021 Mohan Vadivel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
=============================================================================
*/
const OTData = require("./OTmapping");
const sampleData = require("./data");

(function () {
  // Helper function for querySelectors
  function $(a, b = document) {
    return b.querySelector(a);
  }
  function $all(a, b = document) {
    return [...b.querySelectorAll(a)];
  }

  function vibrate(n) {
    if (navigator.vibrate) navigator.vibrate(n);
  }

  function toastMessage(msg, time) {
    $(".toast").classList.add("active");
    $(".toast .msg").innerHTML = msg;
    let delay = time || 2500;
    setTimeout(() => $(".toast").classList.remove("active"), delay);
  }

  let source,
    font,
    fullName,
    family,
    designer,
    version,
    variableAxes,
    namedVariation,
    OTfeatures,
    isDefaultFontLoaded = false;
  (fontSize = 32), (lineHeight = 1.5), (letterSpacing = 0);
  let testArea = $(".test-area");
  let axesCurrentlyAnimating = [];

  // Handling Text alignment
  $(".text-align").onclick = (e) => {
    vibrate(3);
    $("li.active", $(".text-align")).classList.remove("active");
    let li = e.target.closest("li");
    let alignType = li.getAttribute("data-align");
    li.classList.add("active");
    testArea.style.textAlign = alignType;
  };

  // Handling sample data insertion: sample & paragraph
  $(".content-type").onclick = (e) => {
    vibrate(3);
    $("li.active", $(".content-type")).classList.remove("active");
    let li = e.target.closest("li");
    li.classList.add("active");
    let type = li.innerHTML;
    if (type == "Paragraph" || type == "Para") {
      testArea.innerHTML = sampleData.carlSaganQuote;
    } else {
      testArea.innerHTML = sampleData.sample;
    }
  };

  // Handling font file input for small screens
  $(".add-font").onclick = () => $(`input[type="file"]`).click();

  // Default font loading
  function loadDefaultFont() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/fonts/recursive/Recursive_VF_1.078.woff2");
    xhr.responseType = "arraybuffer";

    xhr.onload = function (e) {
      if (xhr.status == 200) {
        source = Buffer.from(xhr.response);
        font = fontkit.create(source);
        setFontProps(font);
        fullName = "Recursive Sans";
        designer = "Arrow Type";
      }
    };

    xhr.send();
  }

  // Listening for Font Input
  (function listen2FontInput() {
    $(`input[type="file"]`).addEventListener("change", (event) =>
      parseFont(event.target.files[0])
    );

    document.ondragover = (event) => {
      event.preventDefault();
      event.stopPropagation();
      $("body").classList.add("drag-over");
      $(".lhs").scrollTop = 0;
    };

    document.ondragleave = (event) => {
      event.preventDefault();
      event.stopPropagation();
      $("body").classList.remove("drag-over");
    };

    $("body").ondrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      parseFont(event.dataTransfer.files[0]);
      $("body").classList.remove("drag-over");
      initialFontLoaded();
    };

    function initialFontLoaded() {
      let tval = localStorage.getItem("initialFontLoaded");
      if (!tval) {
        localStorage.setItem("initialFontLoaded", "true");
      }
      document.querySelector(".drag-drop").style.display = "none";
    }
  })();

  // Parsing the fontfile and sets all the global
  // font props and adds default value 2 testArea
  function parseFont(fontFile) {
    let name = fontFile.name;
    if (!/.*?.(ttf|otf|woff2|woff|dfont)/.test(name)) {
      toastMessage(
        `Only &nbsp;.ttf  &nbsp;.otf  &nbsp;.woff  &nbsp;.woff2  &nbsp;.dfont files are supported`
      );
      return;
    }
    let reader = new FileReader();
    reader.readAsArrayBuffer(fontFile);
    reader.onload = () => {
      source = reader.result;

      try {
        font = fontkit.create(Buffer.from(source));
      } catch (err) {
        toastMessage("Unable to read the font file");
        return;
      }
      setFontProps(font);

      // Error Handling
      reader.onerror = () => {
        toastMessage("Unable to read the font file");
        return;
      };
    };
  }
  function setFontProps(font) {
    const nameRecord = font.name.records;

    family = "familyName" in font ? font.familyName : `Not Available`;
    fullName = checkData("fullName", nameRecord);
    designer = checkData("designer", nameRecord);
    version = getVersion(checkData("version", nameRecord));

    function checkData(prop, nameRecord) {
      if (prop in nameRecord) {
        return nameRecord[prop][Object.keys(nameRecord[prop])[0]];
      } else return `Not Available`;
    }

    variableAxes = font.variationAxes;
    namedVariation = font.namedVariations;
    OTfeatures = font.availableFeatures;

    loadFont2Dom();

    function getVersion(str) {
      if (/Version (\d.[\d]{1,4})/.exec(str)) {
        return /Version (\d.[\d]{1,4})/.exec(str)[1];
      } else return `Not Available`;
    }
  }

  async function loadFont2Dom() {
    try {
      if (isVariableFont) {
        if ("wght" in font.variationAxes) {
          var minWeight = font.variationAxes["wght"]["min"];
          var maxWeight = font.variationAxes["wght"]["max"];
          var option = { weight: `${minWeight} ${maxWeight}` };
        } else {
          var option = {};
        }

        var newFont = new FontFace(family, source, option);

        setFontVariationSettings();
        setFontFeatureSettings();
      } else {
        var newFont = new FontFace(family, source);
      }
      await newFont.load();
      document.fonts.add(newFont);
    } catch (err) {
      toastMessage("Unable to load the font file in DOM");
      return;
    }

    updateUI();

    isDefaultFontLoaded = true;

    console.log(`font family ${family} loaded`);
    testArea.style.fontFamily = family;

    function setFontVariationSettings() {
      let axesAry = Object.keys(variableAxes);
      let str = axesAry.map((x) => `"${x}" var(--${x})`).join(",");
      testArea.style.fontVariationSettings = str;

      // setting Default Value
      axesAry.forEach((x) => {
        testArea.style.setProperty(`--${x}`, variableAxes[x].default);
      });
    }

    function setFontFeatureSettings() {
      let str = OTfeatures.map((e) => `"${e}" var(--${e})`).join(",");
      testArea.style.fontFeatureSettings = str;

      // Setting initial Value
      OTfeatures.forEach((x) => {
        if (x == "kern" || x == "rvrn" || x == "liga" || x == "calt") {
          testArea.style.setProperty(`--${x}`, 1);
        } else {
          testArea.style.setProperty(`--${x}`, 0);
        }
      });
    }
  }

  // DOM Insertion
  function updateUI() {
    // Type Details
    updateTypeDetail();

    // Variable Axes
    if (isVariableFont) {
      updateVariableAxes();
    } else {
      $(".variable-axes").innerHTML = "";
    }

    // OpenType
    if (OTfeatures.length) {
      updateOpenTypeDetail();
    } else {
      $(".open-type").innerHTML = "";
    }
    setDefaultValues();
    listen2Inputs();

    function updateTypeDetail() {
      let typeDetail = $(".type-detail");
      typeDetail.innerHTML = `
    <h5>Type Details</h5>
    <div class="rows">
      <div>
        <label for="fontName">Full Name</label>
        <div id="fontName" class="val">${fullName}</div>
      </div>
      <div>
        <label for="fontDesigner">Designer</label>
        <div id="fontDesigner" class="val">${designer}</div>
      </div>
      <div>
        <lebel for="fontVersion">Version</lebel>
        <div id="fontVersion" class="val">${version}</div>
      </div>
    </div>
  
    <section class="rows-3">
      <div class="primitive-input">
        <label for="font-fontSize">Font Size</label>
        <div id="font-size" class="slider">
          <input type="range" data-id="fontSize" value="${fontSize}" min="8" step="1" max="120" />
          <div class="progress" style="width: 21.4285714286%"></div>
        </div>
        <input
          type="number"
          class="font-size val-input"
          data-id="fontSize"
          value="32"
          min="8"
          step="1"
          max="120"
          id="font-fontSize"
        />
      </div>
  
      <div class="primitive-input">
        <label for="font-lineHeight">Line Height</label>
        <div id="line-height" class="slider">
          <input type="range" data-id="lineHeight" value="${lineHeight}" min="0" max="3" step="0.01" />
          <div class="progress" style="width: 50%"></div>
        </div>
        <input
          type="number"
          class="line-height val-input"
          value="1.5"
          data-id="lineHeight"
          min="0"
          max="3"
          step="0.1"
          id="font-lineHeight"
        />
      </div>
  
      <div class="primitive-input">
        <label for="font-letterSpacing">Letter Spacing</label>
        <div id="letter-spacing" class="slider">
          <input type="range" data-id="letterSpacing" value="${letterSpacing}" min="-7" max="7" step="0.01" />
          <div class="progress" style="width: 50%"></div>
        </div>
        <input
          type="number"
          class="letter-spacing val-input"
          value="0"
          data-id="letterSpacing"
          min="-7"
          max="7"
          step="0.1"
          id="font-letterSpacing"
        />
      </div>
    </section>
    `;
    }

    function updateVariableAxes() {
      let head = `<h5>Variable Axes</h5>  <section class="rows-3">`;

      let variableAxesAry = Object.keys(variableAxes);
      let body;
      if (!variableAxesAry.length) {
        body = `<p class="opacity6"> No variable axes are available</p>`;
      } else {
        let listAry = variableAxesAry.map((axes) => {
          let min = variableAxes[axes].min;
          let max = variableAxes[axes].max;
          let name = variableAxes[axes].name;
          let value = variableAxes[axes].default;
          return `
        <div class="var-axes-set">
          <label for="var-${axes}" >${name}</label>
          <span class="slider">
              <input type="range" class="var"
              value="${value}" 
              id="var-${axes}"
              data-axes="${axes}" 
              min="${min}" 
              max="${max}" 
              step="${min == 0 && max == 1 ? 0.01 : 1}"
              />
    
              <div class="progress" style="width: ${
                ((value - min) * 100) / (max - min)
              }%">
              </div>
          </span>
          <span class="val" >${value}</span>
        </div>
    
      `;
        });
        let list = listAry.join("");

        let namedVar = Object.keys(namedVariation);
        let variation;

        if (namedVar.length) {
          let NVhead = `<div class="var-axes-set named-variation"><div>Named Variation</div><select id="" class="faux-select"><option value="">--Select--</option>`;
          let NVtail = `</select></div>`;
          let options = namedVar
            .map((nv, i) => `<option value="${i}">${nv}</option>`)
            .join("");

          variation = NVhead + options + NVtail;
        } else {
          variation = "";
        }

        let animateHead = `<div class="var-axes-set animate"><div>Animate</div><select id="" class="faux-select"><option value="">--Off--</option>`;

        let animatePostHead = ``;

        let animateList;
        if (variableAxesAry.length == 1) {
          animateList = `<option value="${variableAxesAry[0]}">On</option>`;
        } else {
          animatePostHead = `<option value="all">✾ All</option>`;
          animateList = variableAxesAry
            .map(
              (axes) =>
                `<option value="${axes}">${variableAxes[axes].name}</option>`
            )
            .join("");
        }

        let animateTail = `</select></div>`;

        let animate = animateHead + animatePostHead + animateList + animateTail;

        body = list + variation + animate;
      }

      $(".variable-axes").innerHTML = head + body + `</section>`;
    }

    function updateOpenTypeDetail() {
      let openType = $(".open-type");

      let head = `<h5>OpenType Features</h5>`;
      let listAry = OTfeatures.map((e) => {
        if (e == "kern" || e == "rvrn" || e == "calt" || e == "liga") {
          return `
  <div class="ot-set">
  <div class="faux-checkbox">
  <input id="${e}" type="checkbox" checked data-ot="${e}" />
  <span></span>
</div>
    <label for="${e}" class="exlp">${getOTMap(e)}</label>
    <span class="ext">${e}</span>
  </div>
  `;
        } else {
          return `
        <div class="ot-set">

          <div class="faux-checkbox">
            <input id="${e}" type="checkbox" data-ot="${e}" />
            <span></span>
          </div>
          
          <label for="${e}" class="exlp">${getOTMap(e)}</label>
          <span class="ext">${e}</span>
        </div>
        `;
        }
      });
      let list = listAry.join("");
      openType.innerHTML = head + list;

      function getOTMap(e) {
        if (e.slice(0, 2) == "cv") return `Character Variants ${e.slice(-2)}`;
        return OTData[e];
      }
    }
  }

  // Helper boolean function
  function isVariableFont(font = font) {
    return font.variableAxes.length ? true : false;
  }

  // Setting default value for fontSize, lineHeight &
  // letterSpacing on reload
  function setDefaultValues() {
    setValue($('[data-id="fontSize"]'), fontSize);
    setValue($('[data-id="lineHeight"]'), lineHeight);
    setValue($('[data-id="letterSpacing"]'), letterSpacing);
  }

  // listen to all the inputs and handles the interaction
  function listen2Inputs() {
    // listening to all range and number inputs
    $all('input:not([type="checkbox"])').forEach((input) => {
      input.addEventListener("input", () => {
        setValue(input, input.value);
      });
    });

    // listening to OpenType Checkbox
    $all(".ot-set input").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        vibrate(8);
        let OTChar = e.target.getAttribute("data-ot");
        let val = parseInt(testArea.style.getPropertyValue(`--${OTChar}`));
        let fval = val ? 0 : 1;
        testArea.style.setProperty(`--${OTChar}`, fval);
      });
    });

    if (!Object.keys(variableAxes).length) return;

    // listening to Named Variation Select
    if ($(".named-variation select")) {
      $(".named-variation select").addEventListener("change", (e) => {
        let val = e.target.value;
        let keyObj = Object.keys(namedVariation)[val];
        let keyObjAry = Object.keys(namedVariation[keyObj]);

        keyObjAry.forEach((k) => {
          setValue(
            $(`input[data-axes="${k}"]`),
            namedVariation[keyObj][k],
            true
          );
        });
      });
    }

    // listening to animate Select
    $(".animate select").addEventListener("change", (e) => {
      let val = e.target.value;
      let allAxes = Object.keys(variableAxes);

      // Animate off Case
      if (!val) {
        axesCurrentlyAnimating = [];
        return;
      }

      // Animating all axes
      if (val == "all") {
        let axesNotAnimating = allAxes.filter(
          (a) => !axesCurrentlyAnimating.includes(a)
        );

        axesCurrentlyAnimating = allAxes;

        axesNotAnimating.forEach((ax) => animateAxes(ax));
        return;
      }

      // check whether animating all axes
      if (allAxes.length == axesCurrentlyAnimating.length) {
        axesCurrentlyAnimating = [val];
        return;
      }

      // check whether the axes is already animating
      if (axesCurrentlyAnimating.includes(val)) return;

      axesCurrentlyAnimating = [val];
      animateAxes(val);
    });
  }

  // Sets values to all input and handle all other
  // dependent functionality like updating testArea
  function setValue(input, value) {
    input.value = value;

    // Check whether it is variable-axes input
    if (input.classList.contains("var")) {
      vibrate(3);
      let axes = input.getAttribute("data-axes");
      let max = input.getAttribute("max");
      $(".val", input.closest(".var-axes-set")).innerHTML =
        max > 1 ? parseInt(value) : parseFloat(value).toFixed(2);
      testArea.style.setProperty(`--${axes}`, value);
      syncRangeInput(input);

      // Reset the named-variant value
      if ($(".named-variation select") && arguments.length < 3)
        $(".named-variation select").value = "";

      return;
    }

    let type = input.getAttribute("type");
    let prop = input.getAttribute("data-id");

    if (type === "range") {
      vibrate(3);
      $(`input[type="number"][data-id="${prop}"]`).value = value;
      syncRangeInput(input);
    }
    if (type === "number") {
      let rangeInput = $(`input[type="range"][data-id="${prop}"]`);
      rangeInput.value = value;
      syncRangeInput(rangeInput);
    }

    prop == "lineHeight"
      ? (testArea.style[prop] = value)
      : (testArea.style[prop] = `${value}px`);

    // Handles the custom range input functionality
    // ie. sets the progress width equal to range value
    function syncRangeInput(input) {
      let slider = input.closest(".slider");
      let progress = $(".progress", slider);
      let min = +input.getAttribute("min");
      let max = +input.getAttribute("max");
      let value = +input.value - min;
      let percent = (value * 100) / (max - min);
      progress.style.width = `${percent}%`;
    }
  }

  function easeInOut(x) {
    return Math.pow(Math.sin((5 * x) / Math.PI), 2);
  }

  let easeInOutAry = [...Array(40)].map((e, i) => easeInOut(i / 20));

  function animateAxes(axes) {
    // Each animation will last for 2sec with 100ms as the x resolution
    //

    let count = 0;

    let rangeInp = $(`input[data-axes="${axes}"]`);
    let max = +rangeInp.getAttribute("max");
    let min = +rangeInp.getAttribute("min");

    rangeInp.classList.add("animating");
    rangeInp.disabled = true;
    console.log(`Animating ${axes} from ${min} ⟶ ${max}`);

    requestAnimationFrame(animate);

    function animate() {
      count += 1;
      if (count > 39) count = 0;

      let finalValue = +(easeInOutAry[count] * (max - min) + min);

      setValue(rangeInp, finalValue);

      if (axesCurrentlyAnimating.includes(axes)) {
        setTimeout(() => {
          requestAnimationFrame(animate);
        }, 100);
      } else {
        rangeInp.classList.remove("animating");
        rangeInp.disabled = false;
      }
    }
  }

  // Dark Mode
  class DarkMode {
    constructor(el, namespace, setMetaTheme) {
      this.root = document.querySelector("html");
      if (namespace) this.namespace = namespace;
      if (setMetaTheme) this.setMetaTheme = setMetaTheme;
      this.label = "darkMode";
      this.InitializeTheme();
      el.addEventListener("click", () => this.toggleTheme());
    }

    InitializeTheme() {
      if (this.namespace) this.label = `${this.namespace}-darkMode`;
      let theme = localStorage.getItem(this.label);

      if (theme === "false" || theme == null) {
        this.setLightMode();
        if (this.setMetaTheme) this.setMeta("light");
      } else {
        this.setDarkMode();
        if (this.setMetaTheme) this.setMeta("dark");
      }
    }

    setMeta(theme) {
      let meta = document.querySelector('html meta[name="theme-color"]');
      if (!meta) {
        let meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document
          .querySelector("head")
          .insertAdjacentHTML(
            "beforeend",
            `<meta name="theme-color" content="${
              theme === "dark" ? "#191919" : "#ffffff"
            }" />`
          );
        return;
      }

      meta.insertAdjacentHTML(
        "afterend",
        `<meta name="theme-color" content="${
          theme === "dark" ? "#191919" : "#ffffff"
        }" />`
      );
      meta.remove();
    }

    toggleTheme() {
      let theme = localStorage.getItem(this.label);
      if (theme === "false") {
        this.setDarkMode();
        if (this.setMetaTheme) this.setMeta("dark");
      } else {
        this.setLightMode();
        if (this.setMetaTheme) this.setMeta("light");
      }
    }

    setDarkMode() {
      this.root.classList.add("dark");
      localStorage.setItem(this.label, true);
      if (this.setMetaTheme) this.setMeta("dark");
    }

    setLightMode() {
      this.root.classList.remove("dark");
      localStorage.setItem(this.label, false);
      if (this.setMetaTheme) this.setMeta("light");
    }
  }

  new DarkMode($("#dark-mode"), "var-playground", true);

  // Handling bottom sheet for mobile devices

  // For Mouse Pointer interaction
  // ---------------------------------------------------------------
  $(".seperator").addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener("mouseup", removeEventListener);
    document.addEventListener("mousemove", handleTouch);

    let vh = window.innerHeight;
    let vhmin = vh * (15 / 100);
    let vhmax = vh * (85 / 100);
    let main = $("main").style;

    function handleTouch(e) {
      let y = e.clientY;
      if (y < vhmin) {
        main.setProperty("--row1", `${vhmin}px`);
      } else if (y > vhmax) {
        main.setProperty("--row1", `${vhmax}px`);
      } else {
        main.setProperty("--row1", `${y}px`);
      }
    }

    function removeEventListener() {
      document.removeEventListener("mousemove", handleTouch);
    }
  });

  // For Touch interaction
  // ---------------------------------------------------------------
  $(".seperator").addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("touchstart event");

    document.addEventListener("touchend", removeEventListener);
    document.addEventListener("touchmove", handleTouch);

    let vh = window.innerHeight;
    let y = e.touches[0].clientY;
    let vhmin = vh * (15 / 100);
    let vhmax = vh * (85 / 100);
    let main = $("main").style;
    let hasVibrated = false;

    if (y > vmin || y < vmax) vibrate(8);

    function handleTouch(e) {
      let y = e.touches[0].clientY;
      if (y < vhmin) {
        if (!hasVibrated) {
          vibrate(8);
          hasVibrated = true;
          setTimeout(() => (hasVibrated = false), 500);
        }
        main.setProperty("--row1", `${vhmin}px`);
      } else if (y > vhmax) {
        if (!hasVibrated) {
          vibrate(8);
          hasVibrated = true;
          setTimeout(() => (hasVibrated = false), 500);
        }
        main.setProperty("--row1", `${vhmax}px`);
      } else {
        main.setProperty("--row1", `${y}px`);
      }
    }

    function removeEventListener() {
      document.removeEventListener("touchmove", handleTouch);
    }
  });

  loadDefaultFont();

  addEventListener("load", () => {
    checkWhetherDefaultFontLoaded();

    function checkWhetherDefaultFontLoaded() {
      if (isDefaultFontLoaded) {
        $(".loader").style.display = "none";
        $("main").classList.remove("loading");
      } else {
        setTimeout(() => checkWhetherDefaultFontLoaded(), 100);
      }
    }
  });
})();
