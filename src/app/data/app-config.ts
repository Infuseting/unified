import { CgWebsite } from "react-icons/cg";
import { FaCalendar, FaCalendarAlt } from "react-icons/fa";
import { FaMagnifyingGlass, FaWebflow } from "react-icons/fa6";
import { IconType } from "react-icons/lib";

export interface App {
  id: string;
  nameKey: string;
  icon: IconType;
  url: string;
  roles: string[];
  // Optional sub-choices that can be shown in a modal. Each may have its own redirect URL.
  subChoices?: Array<{
    id: string;
    nameKey: string;
    url?: string;
    roles?: string[];
  }>;
}

export interface Category {
  id: string;
  nameKey: string;
  apps: App[];
}

export interface AppsConfig {
  categories: Category[];
}

export const appsConfig: AppsConfig = {
  categories: [
    {
      id: "tools",
      nameKey: "category.tools",
      apps: [
        {
          id: "zimbra",
          nameKey: "app.zimbra",
          icon: CgWebsite,
          url: "https://webmail.unicaen.fr/",
          roles: [],
        },
        {
          id: "ecampus",
          nameKey: "app.ecampus",
          icon: CgWebsite,
          url: "https://ecampus-vert.unicaen.fr/my/",
          roles: [],
        },
        {
          id: "dokuc3",
          nameKey: "app.dokuc3",
          icon: CgWebsite,
          url: "https://www.iutcaen.unicaen.fr/dokuc3/",
          roles: [],
        },
        {
          id: "webnotes",
          nameKey: "app.webnotes",
          icon: CgWebsite,
          url: "https://webnotes.unicaen.fr/",
          roles: ["student"],
        },
        {
          id: "unicloud",
          nameKey: "app.unicloud",
          icon: CgWebsite,
          url: "https://unicloud.unicaen.fr/",
          roles: [],
        },
        {
          id: "jfanne",
          nameKey: "app.jfanne",
          icon: CgWebsite,
          url: "https://infoiut.jfanne.fr/",
          roles: [],
        },
        
      ]
    },
    {
      id: "dokuc3",
      nameKey: "category.dokuc3",
      apps: [

        {
          id: "dokuc3",
          nameKey: "app.dokuc3",
          icon: CgWebsite,
          url: "https://www.iutcaen.unicaen.fr/dokuc3/",
          roles: [],
        },
        {
          id: "planning",
          nameKey: "app.dokuc3.planning",
          icon: FaCalendarAlt,
          url: "",
          roles: ["student"],
          subChoices: [
            { id: "dokuc3:1", nameKey: "app.dokuc3.1", url: "https://www.iutcaen.unicaen.fr/dokuc3/departement_info/direction_des_etudes_premiere_annee/planning_cc_1a", roles: [] },
            { id: "dokuc3:2", nameKey: "app.dokuc3.2", url: "https://www.iutcaen.unicaen.fr/dokuc3/departement_info/planning_cc/2a", roles: [] },
            { id: "dokuc3:3", nameKey: "app.dokuc3.3", url: "https://www.iutcaen.unicaen.fr/dokuc3/departement_info/direction_des_etudes_troisieme_annee/planning_cc", roles: [] },
          ],
        },
        {
          id: "objet_perdu",
          nameKey: "app.dokuc3.objet_perdu",
          icon: FaMagnifyingGlass,
          url: "https://www.iutcaen.unicaen.fr/dokuc3/objets_trouves",
          roles: [],
        },
      ]
    },
    {
      id: "edt",
      nameKey: "category.edt",
      apps: [
        {
          id: "zimbra",
          nameKey: "app.edt.zimbra",
          icon: FaCalendarAlt,
          url: "https://webmail.unicaen.fr/#2",
          roles: [],
        },
        {
          id: "infuseting",
          nameKey: "app.edt.infuseting",
          icon: FaCalendarAlt,
          url: "https://edt.infuseting.fr/",
          roles: ["student"],
        },
        {
          id: "zimmerman",
          nameKey: "app.edt.zimmerman",
          icon: FaCalendarAlt,
          url: "https://zimmermanna.users.greyc.fr/edt/Emploi-du-temps.php",
          roles: ["student"],
        },
        {
          id: "maner",
          nameKey: "app.edt.maner",
          icon: FaCalendarAlt,
          url: "https://edt.maner.fr/",
          roles: ["student"],
        },
        {
          id: "ade",
          nameKey: "app.edt.ade",
          icon: FaCalendarAlt,
          url: "https://ade.unicaen.fr/",
          roles: ["prof", "vacataire"],
        }
        
      ]
    }
  ]
};
