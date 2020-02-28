import FlexContainer from "./FlexContainer";
import FlexItem from "./FlexItem";
import FlexUtils from "./FlexUtils.js";
import { FlexSubject } from "./FlexSubject";

/**
 * This is the connection between the render tree with the layout tree of this flex container/item.
 */
export default class FlexTarget {
    /**
     * Possible values (only in case of container):
     * bit 0: has changed or contains items with changes
     * bit 1: width changed
     * bit 2: height changed
     */
    private _recalc: number = 0;

    private _enabled: boolean = false;

    public x: number = 0;
    public y: number = 0;
    public w: number = 0;
    public h: number = 0;

    public _flex?: FlexContainer;
    public _flexItem?: FlexItem = undefined;
    public _flexItemDisabled: boolean = false;

    public _items?: FlexTarget[] = undefined;

    constructor(public readonly subject: FlexSubject) {}

    get flexLayout() {
        return this.flex ? this.flex.layout : undefined;
    }

    layoutFlexTree() {
        if (this.isFlexEnabled() && this.isChanged()) {
            this.flexLayout!.layoutTree();
        }
    }

    get flex() {
        return this._flex;
    }

    get flexItem() {
        this._ensureFlexItem();
        return this._flexItem;
    }

    setEnabled(v: boolean) {
        if (!v) {
            if (this.isFlexEnabled()) {
                this._disableFlex();
            }
        } else {
            if (!this.isFlexEnabled()) {
                this._enableFlex();
            }
        }
    }

    setItemEnabled(v: boolean) {
        this._ensureFlexItem();
        if (v !== !this._flexItemDisabled) {
            const prevFlexParent = this.flexParent;
            this._flexItemDisabled = !v;
            this._checkEnabled();
            if (prevFlexParent) {
                prevFlexParent._clearFlexItemsCache();
                prevFlexParent.changedContents();
            }
            const newFlexParent = this.flexParent;
            if (newFlexParent) {
                newFlexParent._clearFlexItemsCache();
                newFlexParent.changedContents();
            }
        }
    }

    private _enableFlex() {
        this._flex = new FlexContainer(this);
        this._checkEnabled();
        this.forceLayout();
        this._enableChildrenAsFlexItems();
    }

    private _disableFlex() {
        this.forceLayout();
        this._flex = undefined;
        this._checkEnabled();
        this._disableChildrenAsFlexItems();
    }

    private _enableChildrenAsFlexItems() {
        const children = this.subject.getChildren();
        if (children) {
            for (let i = 0, n = children.length; i < n; i++) {
                const child = children[i];
                child.getLayout()._enableFlexItem();
            }
        }
    }

    private _disableChildrenAsFlexItems() {
        const children = this.subject.getChildren();
        if (children) {
            for (let i = 0, n = children.length; i < n; i++) {
                const child = children[i];
                child.getLayout()._disableFlexItem();
            }
        }
    }

    private _enableFlexItem() {
        this._ensureFlexItem();
        const flexParent = this.subject!.getParent()!.getLayout();
        this._flexItem!.ctr = flexParent._flex;
        flexParent.changedContents();
        this._checkEnabled();
    }

    private _disableFlexItem() {
        if (this._flexItem) {
            this._flexItem.ctr = undefined;
        }

        // We keep the flexItem object because it may contain custom settings.
        this._checkEnabled();

        this._resetOffsets();
    }

    private _resetOffsets() {
        this.x = this.subject.getSourceX();
        this.y = this.subject.getSourceY();
    }

    private _ensureFlexItem() {
        if (!this._flexItem) {
            this._flexItem = new FlexItem(this);
        }
    }

    private _checkEnabled() {
        const enabled = this.isEnabled();
        if (this._enabled !== enabled) {
            if (enabled) {
                this._enable();
            } else {
                this._disable();
            }
            this._enabled = enabled;
        }
    }

    private _enable() {
        this.subject.enableFlexLayout();
    }

    private _disable() {
        this.restoreSubjectToNonFlex();
        this.subject.disableFlexLayout();
    }

    isEnabled() {
        return this.isFlexEnabled() || this.isFlexItemEnabled();
    }

    isFlexEnabled() {
        return this._flex !== undefined;
    }

    isFlexItemEnabled() {
        return this.flexParent !== undefined;
    }

    private restoreSubjectToNonFlex() {
        const subject = this.subject;
        subject.setLayoutCoords(subject.getSourceX(), subject.getSourceY());
        subject.setLayoutDimensions(subject.getSourceW(), subject.getSourceH());
    }

    setParent(from?: FlexSubject, to?: FlexSubject) {
        if (from && from.getLayout().isFlexEnabled()) {
            from.getLayout()._changedChildren();
        }

        if (to && to.getLayout().isFlexEnabled()) {
            this._enableFlexItem();
            to.getLayout()._changedChildren();
        }
        this._checkEnabled();
    }

    getParent(): FlexTarget | undefined {
        const parent = this.subject.getParent();
        if (!parent) {
            return undefined;
        } else {
            return parent.getLayout();
        }
    }

    get flexParent(): FlexTarget | undefined {
        if (this._flexItemDisabled) {
            return undefined;
        }

        const parent = this.subject.getParent();
        if (parent && parent.getLayout().isFlexEnabled()) {
            return parent.getLayout();
        }
        return undefined;
    }

    updateVisible() {
        const parent = this.flexParent;
        if (parent) {
            parent._changedChildren();
        }
    }

    get items() {
        if (!this._items) {
            this._items = this._getFlexItems();
        }
        return this._items;
    }

    private _getFlexItems(): FlexTarget[] {
        const items = [];
        const children = this.subject.getChildren();
        if (children) {
            for (let i = 0, n = children.length; i < n; i++) {
                const item = children[i];
                if (item.isVisible()) {
                    if (item.getLayout().isFlexItemEnabled()) {
                        items.push(item.getLayout());
                    }
                }
            }
        }
        return items;
    }

    private _changedChildren() {
        this._clearFlexItemsCache();
        this.changedContents();
    }

    private _clearFlexItemsCache() {
        this._items = undefined;
    }

    setLayout(x: number, y: number, w: number, h: number) {
        const subject = this.subject;

        let sourceX = subject.getSourceX();
        let sourceY = subject.getSourceY();
        if (this.funcX) {
            sourceX = this.funcX(FlexUtils.getParentAxisSizeWithPadding(this, true));
        }
        if (this.funcY) {
            sourceY = this.funcY(FlexUtils.getParentAxisSizeWithPadding(this, false));
        }

        if (this.isFlexItemEnabled()) {
            subject.setLayoutCoords(x + sourceX, y + sourceY);
        } else {
            // Reuse the x,y 'settings'.
            subject.setLayoutCoords(sourceX, sourceY);
        }
        subject.setLayoutDimensions(w, h);
    }

    forceLayout(changeWidth = true, changeHeight = true) {
        this._updateRecalc(changeWidth, changeHeight);
    }

    changedContents() {
        this._updateRecalc();
    }

    isChanged() {
        return this._recalc > 0;
    }

    private _updateRecalc(changeExternalWidth = false, changeExternalHeight = false) {
        if (this.isFlexEnabled()) {
            const layout = this._flex!.layout;

            // When something internal changes, it can have effect on the external dimensions.
            changeExternalWidth = changeExternalWidth || layout.isAxisFitToContents(true);
            changeExternalHeight = changeExternalHeight || layout.isAxisFitToContents(false);
        }

        const recalc = 1 + (changeExternalWidth ? 2 : 0) + (changeExternalHeight ? 4 : 0);
        const newRecalcFlags = this.getNewRecalcFlags(recalc);
        this._recalc |= recalc;
        if (newRecalcFlags > 1) {
            if (this.flexParent) {
                this.flexParent._updateRecalcBottomUp(recalc);
            } else {
                this.subject.triggerLayout();
            }
        } else {
            this.subject.triggerLayout();
        }
    }

    getNewRecalcFlags(flags: number) {
        return (7 - this._recalc) & flags;
    }

    private _updateRecalcBottomUp(childRecalc: number) {
        const newRecalc = this._getRecalcFromChangedChildRecalc(childRecalc);
        const newRecalcFlags = this.getNewRecalcFlags(newRecalc);
        this._recalc |= newRecalc;
        if (newRecalcFlags > 1) {
            const flexParent = this.flexParent;
            if (flexParent) {
                flexParent._updateRecalcBottomUp(newRecalc);
            } else {
                this.subject.triggerLayout();
            }
        } else {
            this.subject.triggerLayout();
        }
    }

    private _getRecalcFromChangedChildRecalc(childRecalc: number) {
        const layout = this._flex!.layout;

        const mainAxisRecalcFlag = layout._horizontal ? 1 : 2;
        const crossAxisRecalcFlag = layout._horizontal ? 2 : 1;

        const crossAxisDimensionsChangedInChild = childRecalc & crossAxisRecalcFlag;
        if (!crossAxisDimensionsChangedInChild) {
            const mainAxisDimensionsChangedInChild = childRecalc & mainAxisRecalcFlag;
            if (mainAxisDimensionsChangedInChild) {
                const mainAxisIsWrapping = layout.isWrapping();
                if (mainAxisIsWrapping) {
                    const crossAxisIsFitToContents = layout.isCrossAxisFitToContents();
                    if (crossAxisIsFitToContents) {
                        // Special case: due to wrapping, the cross axis size may be changed.
                        childRecalc += crossAxisRecalcFlag;
                    }
                }
            }
        }

        let isWidthDynamic = layout.isAxisFitToContents(true);
        let isHeightDynamic = layout.isAxisFitToContents(false);

        if (layout.shrunk) {
            // If during previous layout this container was 'shrunk', any changes may change the 'min axis size' of the
            // contents, leading to a different axis size on this container even when it was not 'fit to contents'.
            if (layout._horizontal) {
                isWidthDynamic = true;
            } else {
                isHeightDynamic = true;
            }
        }

        const localRecalc = 1 + (isWidthDynamic ? 2 : 0) + (isHeightDynamic ? 4 : 0);

        return childRecalc & localRecalc;
    }

    get recalc() {
        return this._recalc;
    }

    clearRecalcFlag() {
        this._recalc = 0;
    }

    enableLocalRecalcFlag() {
        this._recalc = 1;
    }

    updatedSourceW() {
        this.forceLayout(true, false);
    }

    updatedSourceH() {
        this.forceLayout(false, true);
    }

    get funcX() {
        return this.subject.getFuncX();
    }

    get funcY() {
        return this.subject.getFuncY();
    }

    get funcW() {
        return this.subject.getFuncW();
    }

    get funcH() {
        return this.subject.getFuncH();
    }
}
