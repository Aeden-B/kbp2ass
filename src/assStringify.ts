/*  

* Based on: `https://github.com/eush77/ass-stringify` 

* By: `eush77`

* License: `MIT`

*/

import type { IDialogueKV, IFormatKV, IScriptInfo, TSection } from "./types";
import { pickValues } from "./utils";

const stringifyDescriptor = {
  comment: (comment: IScriptInfo["body"][0]) => ";" + comment.value,
  formatSpec: (formatSpec: IFormatKV) =>
    formatSpec.key + ": " + formatSpec.value.join(", "),
  properties: (properties: IDialogueKV<string>, format: IFormatKV["value"]) =>
    properties.key + ": " + pickValues(properties.value, format).join(","),
  raw: (raw: IDialogueKV<string>) => raw.key + ": " + raw.value,
};

function stringifySection(section: TSection) {
  const head = "[" + section.section + "]";
  let format = null;

  const body = section.body
    .map(descriptor => {
      const method =
        descriptor.type == "comment"
          ? "comment"
          : descriptor.key == "Format"
          ? "formatSpec"
          : format
          ? "properties"
          : "raw";

      if (method == "formatSpec") {
        format = descriptor.value;
      }

      return stringifyDescriptor[method](descriptor, format);
    })
    .join("\n");

  return body ? head + "\n" + body : head;
}

export default function stringifyAss(ass: TSection[]) {
  return ass.map(stringifySection).join("\n\n") + "\n";
}
