import FlexNode from "./FlexNode";

export interface FlexSubject {
    getChildren(): FlexSubject[] | undefined;
    getLayout(): FlexNode;
    getParent(): FlexSubject | undefined;
    enableFlexLayout(): void;
    disableFlexLayout(): void;
    setLayoutCoords(x: number, y: number): void;
    setLayoutDimensions(w: number, h: number): void;
    isVisible(): boolean;
    triggerLayout(): void;
    getFuncX(): ((parentW: number) => number) | undefined;
    getFuncY(): ((parentH: number) => number) | undefined;
    getFuncW(): ((parentW: number) => number) | undefined;
    getFuncH(): ((parentH: number) => number) | undefined;
    getSourceX(): number;
    getSourceY(): number;
    getSourceW(): number;
    getSourceH(): number;

    // Last layout results. Used to determine changes/reuse caches.
    getLayoutX(): number;
    getLayoutY(): number;
    getLayoutW(): number;
    getLayoutH(): number;
}
