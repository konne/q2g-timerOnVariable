
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
                label: "Config",
                items: {
                    variableName: {
                        ref: "properties.variableName",
                        label: "Variable Name",
                        type: "string"                        
                    },
                    variableExpression: {
                        ref: "properties.variableExpression",
                        label: "Variable Expression",
                        type: "string"
                    },
                    timerValue: {
                        ref: "properties.timerValue",
                        label: "Timer (ms)",
                        type: "string",
                        defaultValue: "5000"
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

    constructor(extensionObject: Enigma.IGenericObject) {
        logger.debug("Constructor of Class: TimerOnVariableExtension");
        
        this.app = extensionObject.app;

        let that = this;
        extensionObject.on("changed", function() { that.extensionObjectChanged(this); });
        this.extensionObjectChanged(extensionObject);
    }

    app: Enigma.IApp;    

    variableName: string;
    variableExpression: string;

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
        this.app
            .getVariableByName(this.variableName)
            .then((res: Enigma.IGenericVariable) => {
                if (res !== null) {
                    this.app.evaluateEx(this.variableExpression)
                        .then((resEval) => {

                            res.setStringValue(resEval.qText)
                                .catch((e: any) => {
                                    this.logger.error("error", e);
                                });
                        })
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
                this.variableName = res.properties.variableName;
                this.variableExpression = res.properties.variableExpression;
                this.timerValue = parseInt(res.properties.timerValue, 10);
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