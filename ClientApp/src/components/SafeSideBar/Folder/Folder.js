﻿import React, { Component } from 'react';
import { faFolder, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './Folder.css';

export class Folder extends Component {
    static displayName = Folder.name;

    constructor(props) {
        super(props);

        // function bindings
        this.SelectFolder = this.SelectFolder.bind(this);
        this.Drag = this.Drag.bind(this);
        this.Drop = this.Drop.bind(this);
        this.SetFolderParent = this.SetFolderParent.bind(this);
        this.SetItemFolder = this.SetItemFolder.bind(this);
        this.BlurName = this.BlurName.bind(this);
        this.SetFolderName = this.SetFolderName.bind(this);
    }

    componentDidMount() {
        document.getElementById("div_folder_" + this.props.folder.id.toString()).addEventListener('contextmenu', e => {
            e.preventDefault();
            this.props.OpenContextMenu(this.props.folder.id, e.pageX + "px", e.pageY + "px");
        });
    }

    render() {
        var fold_id = "div_folder_" + this.props.folder.id; // id for the clickable div tag
        var span_id = "span_folder_" + this.props.folder.id + "_name"; // id of span for when we want it editable

        return (
            <div key={this.props.folder.id} id={fold_id} className="div_folder" onClick={this.SelectFolder} draggable="true" onDragStart={this.Drag} onDrop={this.Drop} onDragOver={this.AllowDrop} >
                <FontAwesomeIcon icon={this.props.selectedFolderID === this.props.folder.id ? faFolderOpen : faFolder} style={{ color: "white" }} />
                <span className="span_folder_name" id={span_id} onBlur={this.BlurName}>{this.props.folder.folderName}</span>
            </div>
        );
    }

    // function to set selected folder and update what the safe is displaying
    async SelectFolder(event) {
        var fold_id = event.currentTarget.id.replace("div_folder_", "");

        // show or hide children as needed.. logic is opposite because the state is changed after the function call.
        if (this.props.folder.hasChild) {
            document.getElementById("div_folder_" + this.props.folder.id + "_child").style.display = document.getElementById("div_folder_" + this.props.folder.id + "_child").style.display === "block" ? "none" : "block";
        }

        this.props.SetSelectedFolder(parseInt(fold_id));
    }

    Drag(event) {
        event.dataTransfer.setData("folder", JSON.stringify(this.props.folder)); // send the entire safeitem
    }

    // makes it so hovering item can be dropped
    AllowDrop(event) {
        event.preventDefault();
    }

    Drop(event) {
        event.preventDefault();

        // if the dropped element is a safe item, we set that item to be associated with this folder
        if (event.dataTransfer.getData("safeitem") !== "") {
            this.SetItemFolder(JSON.parse(event.dataTransfer.getData("safeitem")));
        }
        // if the dropped element is a folder, then we update that folders parent to be this folder
        else if (event.dataTransfer.getData("folder") !== "") {
            this.SetFolderParent(JSON.parse(event.dataTransfer.getData("folder")))
        }
    }

    async SetItemFolder(safeitem) {
        // HTTP request options
        const requestOptions = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'ApiKey': process.env.REACT_APP_API_KEY },
            body: this.props.folder.id,
            credentials: 'include'
        };

        //make request and get response
        const response = await fetch('https://localhost:44366/users/' + this.props.uid + '/accounts/' + safeitem.id + '/folder', requestOptions);
        if (response.ok) {
            safeitem.folderID = this.props.folder.id;
            this.props.UpdateSafeItem(safeitem); // later we may want to do this before the call, and just re-update if the call fails.. it will speed up responsiveness
        }
        // unauthorized could need new access token, so we attempt refresh
        else if (response.status === 401 || response.status === 403) {
            var refreshSucceeded = await this.props.attemptRefresh(); // try to refresh

            // dont recall if the refresh didnt succeed
            if (!refreshSucceeded)
                return;

            this.SetItemFolder(safeitem); // call again
        }
        // if not ok or unauthorized, then its some form of error. code 500, 400, etc...
        else {
        }
    }

    // sets the passed in folder to be a child of this folder (regarding the current component)
    async SetFolderParent(folder) {
        // HTTP request options
        const requestOptions = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'ApiKey': process.env.REACT_APP_API_KEY },
            body: this.props.folder.id,
            credentials: 'include'
        };

        //make request and get response
        const response = await fetch('https://localhost:44366/users/' + this.props.uid + '/folders/' + folder.id + '/parent', requestOptions);
        if (response.ok) {
            const responseText = await response.text();
            this.props.UpdateFolders(JSON.parse(responseText)); // update the folders
        }
        // unauthorized could need new access token, so we attempt refresh
        else if (response.status === 401 || response.status === 403) {
            var refreshSucceeded = await this.props.attemptRefresh(); // try to refresh

            // dont recall if the refresh didnt succeed
            if (!refreshSucceeded)
                return;

            this.SetFolderParent(folder); // call again
        }
        // if not ok or unauthorized, then its some form of error. code 500, 400, etc...
        else {
        }
    }

    BlurName() {
        // if the element wasnt being edited then we just return
        if (document.getElementById("span_folder_" + this.props.folder.id + "_name").attributes.getNamedItem("contentEditable") === "false")
            return;

        // set it no longer editable, remove the event listener for enter key, and get the current folder name
        document.getElementById("span_folder_" + this.props.folder.id + "_name").setAttribute("contentEditable", "false");
        var folderName = document.getElementById("span_folder_" + this.props.folder.id + "_name").innerHTML;

        // check for name change, and set as needed
        if (folderName !== this.props.folder.folderName) {

            this.SetFolderName(folderName);
        }
    }

    // api call to change the folders name
    async SetFolderName(newName) {

        // HTTP request options
        const requestOptions = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'ApiKey': process.env.REACT_APP_API_KEY },
            body: "\"" + newName + "\"",
            credentials: 'include'
        };

        //make request and get response
        const response = await fetch('https://localhost:44366/users/' + this.props.uid + '/folders/' + this.props.folder.id + '/name', requestOptions);
        if (response.ok) {
            this.props.folder.folderName = newName;
            this.props.UpdateSingleFolder(this.props.folder)
        }
        // unauthorized could need new access token, so we attempt refresh
        else if (response.status === 401 || response.status === 403) {
            var refreshSucceeded = await this.props.attemptRefresh(); // try to refresh

            // dont recall if the refresh didnt succeed
            if (!refreshSucceeded)
                return;

            this.SetFolderName(newName); // call again
        }
        // if not ok or unauthorized, then its some form of error. code 500, 400, etc...
        else {
            document.getElementById("span_folder_" + this.props.folder.id + "_name").innerHTML = this.props.folder.folderName; // reset name if the api call failed
        }
    }
}
