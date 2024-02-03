import * as cheerio from "cheerio";
import { FrameButton, FrameButtonsType, Frame } from "./types";
import { getByteLength, isValidVersion } from "./utils";

export function getFrame({
  htmlString,
  url,
}: {
  htmlString: string;
  url: string;
}): Frame | null {
  const $ = cheerio.load(htmlString);

  const version = $("meta[property='fc:frame'], meta[name='fc:frame']").attr(
    "content"
  );
  const image = $(
    "meta[property='fc:frame:image'], meta[name='fc:frame:image']"
  ).attr("content");

  const postUrl =
    $(
      "meta[property='fc:frame:post_url'], meta[name='fc:frame:post_url']"
    ).attr("content") || url;

  const inputText = $(
    "meta[property='fc:frame:input:text'], meta[name='fc:frame:input:text']"
  ).attr("content");

  const buttonLabels = $(
    "meta[property^='fc:frame:button']:not([property$=':action']), meta[name^='fc:frame:button']:not([name$=':action'])"
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  const buttonActions = $(
    'meta[name^="fc:frame:button:"][name$=":action"], meta[property^="fc:frame:button:"][property$=":action"]'
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  const buttonsWithActions = buttonLabels
    .map((button): FrameButton & { index: number } => {
      const action = buttonActions.find(
        (action) => action?.buttonNumber === button?.buttonNumber
      );
      return {
        index: button?.buttonNumber || 0,
        label: button?.content || "",
        action: action?.content === "post_redirect" ? "post_redirect" : "post",
      };
    })
    .sort((a, b) => a.index - b.index)
    .map(
      (button): FrameButton => ({
        label: button.label,
        action: button.action,
      })
    );

  // TODO: Useful error messages
  if (
    !version ||
    !isValidVersion(version) ||
    !image ||
    buttonsWithActions.length > 4 ||
    (inputText && getByteLength(inputText) > 32)
  ) {
    return null;
  }

  return {
    version: version as "vNext" | `${number}-${number}-${number}`,
    image: image,
    buttons: buttonsWithActions as FrameButtonsType,
    postUrl,
    inputText,
  };
}
export function parseButtonElement(elem: cheerio.Element) {
  const nameAttr = elem.attribs["name"] || elem.attribs["property"];
  const buttonNumber = nameAttr?.split(":")[3];
  try {
    return {
      buttonNumber: parseInt(buttonNumber || ""),
      content: elem.attribs["content"],
    };
  } catch (error) {
    return null;
  }
}