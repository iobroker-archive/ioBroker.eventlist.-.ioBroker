import React from 'react';
import { withStyles } from '@mui/styles';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { ColorPicker, Router, Loader, I18n }  from '@iobroker/adapter-react-v5';
import GenericApp from '@iobroker/adapter-react-v5/GenericApp';

import TabOptions from './Tabs/Options';
import TabList from './Tabs/List';
import TabPDF from './Tabs/PdfSettings';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto'
    },
    tabContentIFrame: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px - 38px)',
        overflow: 'auto'
    },
    selected: {
        color: theme.palette.mode === 'dark' ? undefined : '#FFF !important',
    },
    indicator: {
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.secondary.main : '#FFF',
    },
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = {...props};
        extendedProps.translations = {
            en: require('./i18n/en'),
            de: require('./i18n/de'),
            ru: require('./i18n/ru'),
            pt: require('./i18n/pt'),
            nl: require('./i18n/nl'),
            fr: require('./i18n/fr'),
            it: require('./i18n/it'),
            es: require('./i18n/es'),
            pl: require('./i18n/pl'),
            uk: require('./i18n/uk'),
            'zh-cn': require('./i18n/zh-cn'),
        };
        extendedProps.sentryDSN = window.sentryDSN;
        extendedProps.bottomButtons = true;

        if (!window.location.pathname.includes('adapter/') && window.location.port !== '3000') {
            extendedProps.bottomButtons = false;
        } else if (window.location.pathname.includes('/tab.html') || window.location.pathname.includes('/tab_m.html')) {
            extendedProps.bottomButtons = false;
        }

        if (window.socketUrl && window.socketUrl.startsWith(':')) {
            window.socketUrl = `${window.location.protocol}//${window.location.hostname}${window.socketUrl}`;
        }

        super(props, extendedProps);

        this.isTab = !extendedProps.bottomButtons;
        this.isWeb = window.socketUrl !== undefined;
    }

    getSelectedTab() {
        const tab = this.state.selectedTab;
        if (!tab || tab === 'options') {
            return 0;
        } else if (tab === 'list') {
            return 1;
        } else if (tab === 'pdf') {
            return 2;
        }
    }

    onPrepareSave(native) {
        if (native.defaultBooleanColorTrue) {
            native.defaultBooleanColorTrue = ColorPicker.getColor(native.defaultBooleanColorTrue);
        }
        if (native.defaultBooleanColorFalse) {
            native.defaultBooleanColorFalse = ColorPicker.getColor(native.defaultBooleanColorFalse);
        }

        Object.keys(native.pdfSettings).forEach(attr => {
            if (attr.toLowerCase().includes('color')) {
                if (typeof native.pdfSettings[attr] === 'object') {
                    native.pdfSettings[attr] = ColorPicker.getColor(native.pdfSettings[attr], true);
                }
                if (native.pdfSettings[attr].startsWith('rgb')) {
                    native.pdfSettings[attr] = ColorPicker.RGB2hex(native.pdfSettings[attr]);
                }
            }
        });

        super.onPrepareSave();
    }

    updateNative(native, cb) {
        const changed = JSON.stringify(native) !== JSON.stringify(this.savedNative);
        this.setState({ native, changed }, cb);
    }

    renderTabsForConfig() {
        return <>
            <AppBar position="static">
                <Tabs
                    value={this.getSelectedTab()}
                    onChange={e => Router.doNavigate(e.target.dataset.name)}
                    classes={{ indicator: this.props.classes.indicator }}
                >
                    <Tab classes={{ selected: this.props.classes.selected }} label={I18n.t('Options')}    data-name="options" />
                    <Tab classes={{ selected: this.props.classes.selected }} label={I18n.t('Event list')} data-name="list" />
                    <Tab classes={{ selected: this.props.classes.selected }} label={I18n.t('PDF')}        data-name="pdf" />
                </Tabs>
            </AppBar>

            <div className={this.isIFrame ? this.props.classes.tabContentIFrame : this.props.classes.tabContent}>
                {(this.state.selectedTab === 'options' || !this.state.selectedTab) && <TabOptions
                    key="options"
                    common={this.common}
                    socket={this.socket}
                    native={this.state.native}
                    onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                    onLoad={native => this.onLoadConfig(native)}
                    instance={this.instance}
                    adapterName={this.adapterName}
                    changed={this.state.changed}
                    onChange={(attr, value, cb) => this.updateNativeValue(attr, value, cb)}
                />}
                {this.state.selectedTab === 'list' && this.renderEventList()}
                {this.state.selectedTab === 'pdf' && <TabPDF
                    key="pdf"
                    common={this.common}
                    socket={this.socket}
                    native={this.state.native}
                    onError={text => this.setState({ errorText: text })}
                    instance={this.instance}
                    adapterName={this.adapterName}
                    onChange={(attr, value, cb) => this.updateNativeValue(attr, value, cb)}
                    updateNative={(native, cb) => this.updateNative(native, cb)}
                />}
            </div>
            {this.renderSaveCloseButtons()}
        </>;
    }

    renderEventList() {
        return <TabList
            key="enums"
            imagePrefix={this.isWeb ? '../' : '../..'}
            isWeb={this.isWeb}
            editEnabled={!this.isTab}
            showEditButton={this.isTab}
            themeName={this.state.themeName}
            themeType={this.state.themeType}
            common={this.common}
            socket={this.socket}
            native={this.state.native}
            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
            instance={this.instance}
            adapterName={this.adapterName}
            name={this.common.titleLang}
        />;
    }

    render() {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Loader themeType={this.state.themeType} />
                </ThemeProvider>
            </StyledEngineProvider>;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <div className="App" style={{ background: this.state.theme.palette.background.default, color: this.state.theme.palette.text.primary }}>
                    {!this.isTab ?
                        this.renderTabsForConfig()
                        :
                        this.renderEventList()
                    }
                    {this.renderError()}
                </div>
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default withStyles(styles)(App);
