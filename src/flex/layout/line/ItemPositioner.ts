import SpacingCalculator from "../SpacingCalculator";
import LineLayout from "./LineLayout";

export default class ItemPositioner {
    constructor(private _line: LineLayout) {}

    get _layout() {
        return this._line._layout;
    }

    position() {
        const { spacingBefore, spacingBetween } = this._getSpacing();

        let currentPos = spacingBefore;

        const items = this._line.items;
        for (let i = this._line.startIndex; i <= this._line.endIndex; i++) {
            const item = items[i];

            item.flexItem!._setMainAxisLayoutPos(currentPos);
            currentPos += item.flexItem!._getMainAxisLayoutSizeWithPaddingAndMargin();
            currentPos += spacingBetween;
        }
    }

    _getSpacing() {
        const remainingSpace = this._line._availableSpace;
        const mode = this._layout._flexContainer.justifyContent;
        const numberOfItems = this._line.numberOfItems;

        return SpacingCalculator.getSpacing(mode, numberOfItems, remainingSpace);
    }
}
