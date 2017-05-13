
//#region Imports
import "css!./q2g-timerOnVariable.css";
import * as template from "text!./q2g-timerOnVariable.html";
import { Logging } from "./lib/logger";
//#endregion

//#region Logger
Logging.LogConfig.SetLogLevel("*", Logging.LogLevel.info);
let logger: Logging.Logger = new Logging.Logger("Main");
//#endregion

//#region interfaces
interface IVMScope<T> extends ExtensionAPI.IExtensionScope {
    vm: T;
}
//#endregion

class DefinitionObject {
    public definition = {
        uses: "settings",
        items: {
            options: {
                type: "items",
                label: "Shortcut",
                items: {
                    textVariable: {
                        ref: "properties.textVariable",
                        label: "Variable",
                        type: "string",
                        defaultValue: "timerVariable"
                    },
                    numTimer: {
                        ref: "properties.numTimer",
                        label: "Timer",
                        type: "string",
                        defaultValue: "1000"
                    }
                }
            }
        }
    };
    public getDefinition(): any {
        return this.definition;
    };
}

class TimerOnVariableExtension {

    logger: Logging.Logger = new Logging.Logger("TimerOnVariableExtension");

    constructor(enigmaRoot: Enigma.IGenericObject) {
        logger.debug("Constructor of Class: KeycodeGeneratorExtension");

        this.enigmaRoot = enigmaRoot;
        this.enigmaModel = enigmaRoot.app;

        this.enigmaRoot.on("changed", () => {
            this.extensionObjectChanged(this.enigmaRoot);
        });
        this.extensionObjectChanged(this.enigmaRoot);
    }

    enigmaModel: Enigma.IApp;
    enigmaRoot: Enigma.IGenericObject;

    textVariable: string;

    private timerHandle: number;
    private _timerValue: number = 0;
    public get timerValue(): number{
        return this._timerValue;
    }
    public set timerValue(value: number) {
        if (this._timerValue !== value) {
            if (this._timerValue > 0) {
                clearInterval(this.timerHandle);
            }
            this._timerValue = value;
            if (this._timerValue > 0) {
                this.timerHandle = setInterval(() => { this.timerElapsed(); }, this._timerValue);
            }
        }
    }

    private timerElapsed(): void {
        this.logger.trace("Timer called");
        this.enigmaModel
            .getVariableByName(this.textVariable)
            .then((res: Enigma.IGenericVariable) => {
                if (res !== null) {
                    let t: Date = new Date();
                    res.setStringValue(t.toLocaleTimeString().toString())
                        .catch((e: any) => {
                            this.logger.error("error", e);
                        });
                }
            })
            .catch((e: any) => {
                this.logger.error("error", e);
            });
    }

    private extensionObjectChanged(obj: Enigma.IGenericObject): void {
        try {
            obj.getLayout().then((res: Enigma.IGenericObjectProperties) => {
                this.textVariable = res.properties.textVariable;
                this.timerValue = parseInt(res.properties.numTimer, 10);
            });
        } catch (e) {
            this.logger.error("error in SelectionExtension class in function extensionObjectChanged", e);
        }
    }
}

//#region global variables
let definitionObject: DefinitionObject = new DefinitionObject();
//#endregion

export = {
    definition: definitionObject.getDefinition(),
    initialProperties: { },
    template: template,
    controller: ["$scope", function (
        scope: IVMScope<TimerOnVariableExtension>, element: JQuery): void {
        let enigmaRoot: Enigma.IGenericObject = (scope.component.model as any) as Enigma.IGenericObject;
        if ((scope.component.model as any).enigmaModel) {
            // pre 3.2 SR3 enigma is in a subvariable of model
            enigmaRoot = (scope.component.model as any).enigmaModel as Enigma.IGenericObject;
        }

        let te: TimerOnVariableExtension = new TimerOnVariableExtension(enigmaRoot);
        scope.vm = te;
        scope.$on("$destroy", () => {
            logger.trace("destroy of scope");
            te.timerValue = 0;
        });
    }]
}